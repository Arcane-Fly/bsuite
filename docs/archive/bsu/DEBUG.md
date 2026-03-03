# Debug Mode Usage Guide

This application includes comprehensive debugging capabilities to help diagnose authentication timeouts and message channel errors.

## Enabling Debug Mode

Set the following environment variable in your `.env` file:
```
VITE_DEBUG_MODE=true
```

## Configuration Options

```bash
# Authentication timeout (default: 30000ms = 30 seconds)
VITE_AUTH_TIMEOUT=30000

# Debug mode (default: false)
VITE_DEBUG_MODE=true

# Supabase configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## MCP Debugging

The application includes a built-in MCP (Message Channel Protocol) debugger accessible via browser console:

### Browser Console Commands

```javascript
// Get comprehensive debug information
MCPDebugger.printDebugInfo()

// Test connection health
MCPDebugger.testConnectionHealth()

// Export debug report as JSON
console.log(MCPDebugger.exportDebugReport())

// Get debug info object
const info = MCPDebugger.getDebugInfo()
```

### Debug Information Includes

- Browser and user agent details
- Current URL and environment
- Browser extension detection
- Service worker status
- Environment variables
- Memory usage (if available)
- Recent error history
- Connection health checks

## Common Issues and Solutions

### Authentication Timeout Errors
- **Problem**: "Authentication timeout" errors after 10 seconds
- **Solution**: Increase `VITE_AUTH_TIMEOUT` value or check Supabase configuration

### Message Channel Errors
- **Problem**: "A listener indicated an asynchronous response by returning true, but the message channel closed"
- **Solution**: These are typically caused by browser extensions and are now automatically suppressed

### Environment Configuration
- **Problem**: Missing Supabase credentials
- **Solution**: Copy `.env.example` to `.env` and configure with actual values

## Monitoring

When debug mode is enabled, the application will:
- Log detailed authentication flow information
- Track and display error patterns
- Provide connection health status
- Show memory usage and performance metrics
- Export comprehensive debug reports

## Production Deployment

For production deployments:
1. Set `VITE_DEBUG_MODE=false` or remove it entirely
2. Ensure proper Supabase credentials are configured
3. Set appropriate `VITE_AUTH_TIMEOUT` for your network conditions