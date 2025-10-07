export interface SearchResult {
  id: string;
  type: "name" | "address" | "collection" | "nft";
  title: string;
  subtitle?: string;
  status?: "available" | "registered" | "reserved";
  price?: number;
  owner?: string;
  avatar?: string;
  priority?: number; // For sorting results
}

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  resultType?: string;
}

export interface SearchSuggestion {
  query: string;
  type: "history" | "trending" | "suggestion";
  count?: number;
}

class SearchService {
  private static instance: SearchService;
  private readonly HISTORY_KEY = "envoi_search_history";
  private readonly CACHE_KEY = "envoi_search_cache";
  private readonly MAX_HISTORY_ITEMS = 10;
  private readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_ITEMS = 50;

  // In-memory cache for better performance
  private searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
  private nameAvailabilityCache = new Map<string, { isRegistered: boolean; owner?: string; timestamp: number }>();

  private constructor() {}

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  // Cache management methods
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_EXPIRY;
  }

  private getCachedResults(query: string): SearchResult[] | null {
    const cached = this.searchCache.get(query);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.results;
    }
    return null;
  }

  private setCachedResults(query: string, results: SearchResult[]): void {
    // Limit cache size
    if (this.searchCache.size >= this.MAX_CACHE_ITEMS) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey) {
        this.searchCache.delete(firstKey);
      }
    }
    
    this.searchCache.set(query, {
      results,
      timestamp: Date.now(),
    });
  }

  private getCachedNameAvailability(name: string): { isRegistered: boolean; owner?: string } | null {
    const cached = this.nameAvailabilityCache.get(name);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return { isRegistered: cached.isRegistered, owner: cached.owner };
    }
    return null;
  }

  private setCachedNameAvailability(name: string, isRegistered: boolean, owner?: string): void {
    // Limit cache size
    if (this.nameAvailabilityCache.size >= this.MAX_CACHE_ITEMS) {
      const firstKey = this.nameAvailabilityCache.keys().next().value;
      if (firstKey) {
        this.nameAvailabilityCache.delete(firstKey);
      }
    }
    
    this.nameAvailabilityCache.set(name, {
      isRegistered,
      owner,
      timestamp: Date.now(),
    });
  }

  private async checkNameAvailability(name: string): Promise<{ isRegistered: boolean; owner?: string }> {
    // Check cache first
    const cached = this.getCachedNameAvailability(name);
    if (cached) {
      return cached;
    }

    try {
      const { RegistryService } = await import("../services/registry");
      const registry = new RegistryService("mainnet");
      const owner = await registry.ownerOf(name);
      const isRegistered = Boolean(owner && owner !== "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ");
      
      // Cache the result
      this.setCachedNameAvailability(name, isRegistered, owner || undefined);
      
      return { isRegistered, owner: owner || undefined };
    } catch (error) {
      console.error(`Error checking ${name} availability:`, error);
      return { isRegistered: false };
    }
  }

  private async checkBaseNameAvailability(baseName: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Define domain options for base names
    const domainOptions = [
      { domain: 'voi', priority: 1 },
      { domain: 'founder.voi', priority: 2 }
    ];

    // Check each domain option and collect results
    const domainResults: SearchResult[] = [];
    
    for (const { domain, priority } of domainOptions) {
      const fullName = `${baseName}.${domain}`;
      
      const { isRegistered, owner } = await this.checkNameAvailability(fullName);
      
      domainResults.push({
        id: fullName,
        type: "name",
        title: fullName,
        subtitle: isRegistered && owner ? `Owned by ${this.formatAddress(owner)}` : "Available for registration",
        status: isRegistered ? "registered" : "available",
        price: isRegistered ? undefined : this.getNamePrice(fullName),
        owner: isRegistered ? owner : undefined,
        priority, // Add priority for sorting
      });

      // Add variations for .voi domain (always show variations regardless of main name status)
      if (domain === 'voi') {
        // Only add one variation: name{year}.voi
        const currentYear = new Date().getFullYear();
        const yearVariation = `${baseName}${currentYear}.voi`;
        
        const varResult = await this.checkNameAvailability(yearVariation);
        
        if (!varResult.isRegistered) {
          domainResults.push({
            id: yearVariation,
            type: "name",
            title: yearVariation,
            subtitle: "Available for registration",
            status: "available",
            price: this.getNamePrice(yearVariation),
            priority: 3, // Variations have lower priority
          });
        }
      }
    }
    
    // Sort domain results by priority and add to main results
    domainResults.sort((a, b) => (a.priority || 999) - (b.priority || 999));
    
    // Limit to maximum 3 suggestions
    const limitedResults = domainResults.slice(0, 3);
    results.push(...limitedResults);
    
    return results;
  }

  private async checkSubnameAvailability(fullName: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    try {
      // Parse the subname to get parent domain
      const parts = fullName.split('.');
      if (parts.length < 2) {
        return results; // Not a valid subname
      }
      
      const subname = parts[0];
      const parentDomain = parts.slice(1).join('.');
      
      // Check if parent domain has a subname registrar
      const subnameRegistrar = await this.getSubnameRegistrar(parentDomain);
      
      if (subnameRegistrar) {
        // Check if base_cost is missing or "0" - if so, drop from options
        if (!subnameRegistrar.base_cost || subnameRegistrar.base_cost === "0") {
          // Don't add to results - subname registrar exists but not available for purchase
          return results;
        }
        
        // Check availability using the subname registrar
        const { isRegistered, owner } = await this.checkNameAvailability(fullName);
        
        results.push({
          id: fullName,
          type: "name",
          title: fullName,
          subtitle: isRegistered && owner 
            ? `Owned by ${this.formatAddress(owner)}` 
            : "Available for registration",
          status: isRegistered ? "registered" : "available",
          price: isRegistered ? undefined : this.getSubnamePrice(fullName, subnameRegistrar),
          owner: isRegistered ? owner : undefined,
          priority: 1,
        });
      } else {
        // No subname registrar found - treat as unavailable
        results.push({
          id: fullName,
          type: "name",
          title: fullName,
          subtitle: "No subname registrar found",
          status: "reserved",
          priority: 1,
        });
      }
    } catch (error) {
      console.error(`Error checking subname availability for ${fullName}:`, error);
      results.push({
        id: fullName,
        type: "name",
        title: fullName,
        subtitle: "Error checking availability",
        status: "reserved",
        priority: 1,
      });
    }
    
    return results;
  }

  private async getSubnameRegistrar(parentDomain: string): Promise<{
    subname_registrar: string;
    contract: string;
    payment_token?: string;
    symbol?: string;
    decimals?: string;
    base_cost?: string;
  } | null> {
    try {
      const { ResolverService } = await import("../services/resolver");
      const { namehash } = await import("../utils/namehash");
      const { stringToUint8Array } = await import("../services/registry");
      
      const resolver = new ResolverService("mainnet");
      const subnameRegistrarR = await resolver.text(
        await namehash(parentDomain),
        stringToUint8Array("subname_registrar", 22)
      );
      
      if (subnameRegistrarR.success && subnameRegistrarR.returnValue) {
        const subnameRegistrarData = JSON.parse(
          new TextDecoder().decode(subnameRegistrarR.returnValue).replace(/\0/g, '')
        );
        return subnameRegistrarData;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting subname registrar for ${parentDomain}:`, error);
      return null;
    }
  }

  private getSubnamePrice(name: string, subnameRegistrar: any): number {
    // Use base cost from subname registrar if available
    if (subnameRegistrar.base_cost) {
      return Number(subnameRegistrar.base_cost) / 1000000; // Convert from micro units
    }
    
    // Fallback to default pricing
    return this.getNamePrice(name);
  }

  // Search History Management
  public addToHistory(query: string, resultType?: string): void {
    if (!query.trim()) return;

    const history = this.getHistory();
    const newItem: SearchHistoryItem = {
      query: query.trim(),
      timestamp: Date.now(),
      resultType,
    };

    // Remove existing entry with same query
    const filteredHistory = history.filter(item => item.query !== newItem.query);
    
    // Add new item at the beginning
    const updatedHistory = [newItem, ...filteredHistory].slice(0, this.MAX_HISTORY_ITEMS);
    
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(updatedHistory));
  }

  public getHistory(): SearchHistoryItem[] {
    try {
      const stored = localStorage.getItem(this.HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error reading search history:", error);
      return [];
    }
  }

  public clearHistory(): void {
    localStorage.removeItem(this.HISTORY_KEY);
  }

  public removeFromHistory(query: string): void {
    const history = this.getHistory();
    const filteredHistory = history.filter(item => item.query !== query);
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(filteredHistory));
  }

  // Search Suggestions
  public getSuggestions(query: string): SearchSuggestion[] {
    const history = this.getHistory();
    const suggestions: SearchSuggestion[] = [];

    // Add history suggestions that match the query
    const historyMatches = history
      .filter(item => 
        item.query.toLowerCase().includes(query.toLowerCase()) && 
        item.query.toLowerCase() !== query.toLowerCase()
      )
      .slice(0, 3)
      .map(item => ({
        query: item.query,
        type: "history" as const,
      }));

    suggestions.push(...historyMatches);

    // Add trending suggestions (mock data for now)
    const trendingSuggestions: SearchSuggestion[] = [
      { query: "alice.voi", type: "trending", count: 150 },
      { query: "alice.founder.voi", type: "trending", count: 120 },
      { query: "bob.voi", type: "trending", count: 89 },
      { query: "bob.founder.voi", type: "trending", count: 75 },
      { query: "charlie.voi", type: "trending", count: 67 },
      { query: "charlie.founder.voi", type: "trending", count: 45 },
    ];

    const trendingMatches = trendingSuggestions
      .filter(item => 
        item.query.toLowerCase().includes(query.toLowerCase()) &&
        !suggestions.some(s => s.query === item.query)
      )
      .slice(0, 2);

    suggestions.push(...trendingMatches);

    return suggestions;
  }

  // Search Execution
  public async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const trimmedQuery = query.trim().toLowerCase();
    
    // Check cache first
    const cachedResults = this.getCachedResults(trimmedQuery);
    if (cachedResults) {
      // Add to search history even for cached results
      this.addToHistory(query, cachedResults[0]?.type);
      return cachedResults;
    }

    try {
      const results: SearchResult[] = [];

      // Auto-complete .of to .of.voi
      let searchQuery = trimmedQuery;
      if (trimmedQuery.endsWith('.of')) {
        searchQuery = trimmedQuery + '.voi';
      }

      // Check if it's a .voi name or potential name
      if (searchQuery.includes('.voi') || searchQuery.includes('.founder') || trimmedQuery.match(/^[a-zA-Z0-9]+$/)) {
        const baseName = searchQuery.replace(/\.(voi|founder)$/, '');
        
        // Check if this is a subname (has more than one dot) or base name
        const dotCount = (searchQuery.match(/\./g) || []).length;
        if (dotCount > 1) {
          // This is a subname - check subname registrars
          const subnameResults = await this.checkSubnameAvailability(searchQuery);
          results.push(...subnameResults);
        } else {
          // This is a base name - check base registrar
          const baseResults = await this.checkBaseNameAvailability(baseName);
          results.push(...baseResults);
        }
      }

      // Check if it's an Algorand address (58 characters, base32)
      if (trimmedQuery.length === 58 && trimmedQuery.match(/^[A-Z2-7]+$/)) {
        results.push({
          id: trimmedQuery,
          type: "address",
          title: this.formatAddress(trimmedQuery),
          subtitle: "Wallet address",
        });
      }

      // Check if it's a partial address (show format hint)
      if (trimmedQuery.length > 4 && trimmedQuery.match(/^[A-Z2-7]+$/) && trimmedQuery.length < 58) {
        results.push({
          id: trimmedQuery,
          type: "address",
          title: `${trimmedQuery}...`,
          subtitle: "Partial address - enter full address",
        });
      }

      // Add to search history
      this.addToHistory(query, results[0]?.type);

      // Cache the results
      this.setCachedResults(trimmedQuery, results);

      return results;
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  }

  private formatAddress(address: string): string {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  private getNamePrice(name: string): number {
    // Simple pricing logic - in a real app, this would come from a pricing service
    const baseName = name.replace('.voi', '');
    if (baseName.length <= 3) return 1.0;
    if (baseName.length <= 5) return 0.5;
    if (baseName.length <= 8) return 0.1;
    return 0.05;
  }

  // Recent searches for quick access
  public getRecentSearches(limit: number = 5): SearchHistoryItem[] {
    return this.getHistory().slice(0, limit);
  }

  // Popular searches (mock data)
  public getPopularSearches(): SearchSuggestion[] {
    return [
      { query: "alice.voi", type: "trending", count: 150 },
      { query: "alice.founder.voi", type: "trending", count: 120 },
      { query: "bob.voi", type: "trending", count: 89 },
      { query: "bob.founder.voi", type: "trending", count: 75 },
      { query: "charlie.voi", type: "trending", count: 67 },
      { query: "charlie.founder.voi", type: "trending", count: 45 },
      { query: "david.voi", type: "trending", count: 45 },
      { query: "david.founder.voi", type: "trending", count: 35 },
      { query: "eve.voi", type: "trending", count: 32 },
      { query: "eve.founder.voi", type: "trending", count: 28 },
    ];
  }

  // Cache management
  public clearCache(): void {
    this.searchCache.clear();
    this.nameAvailabilityCache.clear();
  }

  public getCacheStats(): { searchCache: number; nameCache: number } {
    return {
      searchCache: this.searchCache.size,
      nameCache: this.nameAvailabilityCache.size,
    };
  }
}

export default SearchService;
