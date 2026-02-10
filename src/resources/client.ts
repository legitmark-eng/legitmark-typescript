/** Internal client interface for resource classes */
export interface ResourceClient {
  _get<T>(endpoint: string, params?: Record<string, string>): Promise<T>;
  _post<T>(endpoint: string, data?: unknown): Promise<T>;
}
