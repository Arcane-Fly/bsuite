> [IMPORTED FROM CRM13] -- Reference only, not canonical

# MCP Servers Fix

## Overview

This document outlines the fixes and improvements made to the Model Context Protocol (MCP) servers configuration. The MCP system enables communication between the main application and locally running MCP servers that provide specialized tools and resources.

## Issues Fixed

1. **Filesystem Server**: Fixed path configuration to use accessible directories
   - Changed from `/home/braden/Desktop/Dev` to `/home/node` and `/workspace`

2. **Reminder Server**: Fixed missing server implementation
   - Created a new reminder server implementation in `/workspace/MCP/reminder-server`
   - Implemented CRUD operations for reminders

3. **GitHub Server**: Updated configuration
   - Ensured proper environment variable handling

4. **Server Activation (March 1, 2025)**:
   - Enabled previously disabled MCP servers (bing-search and reminder)
   - Fixed configuration in `cline_mcp_settings.json` to ensure all required servers are available
   - This resolved application errors related to missing MCP functionality

## New Capabilities

### Browserbase MCP Server

Added a new MCP server that provides cloud browser automation capabilities using Browserbase:

> **Note:** The Browserbase service has usage limits on the free plan. When attempting to create a browser session, you may encounter a "Free plan browser minutes limit reached" error if the account has used all its allocated minutes.

- **Browser Automation**: Control and orchestrate cloud browsers
  - Create browser sessions
  - Navigate to URLs
  - Take screenshots
  - Click elements
  - Fill forms
  - Execute JavaScript
  - Extract content

- **Console Monitoring**: Track and analyze browser console logs

### Bing Search Server

Added a new MCP server that provides Bing search capabilities with Puppeteer integration:

- **Search Tool**: Search the web using Bing Search API
  - Supports web, image, and news searches
  - Configurable result count

- **Browse Tool**: Browse webpages using Puppeteer
  - Navigate to URLs
  - Perform actions like clicking, typing, scrolling
  - Capture screenshots
  - Extract page content

## Configuration

The MCP servers are configured in the `cline_mcp_settings.json` file with the following structure:

```json
{
  "mcpServers": {
    "github.com/browserbase/mcp-server-browserbase": {
      "command": "node",
      "args": [
        "/workspace/MCP/browserbase-server/browserbase/dist/index.js"
      ],
      "env": {
        "BROWSERBASE_API_KEY": "bb_live_qMjRHP6t5Mo0xbclULWt0lv60W0",
        "BROWSERBASE_PROJECT_ID": "fc6ac642-0cb7-4587-b424-4b20c9105b58"
      },
      "disabled": false,
      "autoApprove": []
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "disabled": false,
      "autoApprove": []
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/home/node",
        "/workspace"
      ],
      "disabled": false,
      "autoApprove": ["list_directory", "read_file"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PAT}"
      },
      "disabled": false,
      "autoApprove": []
    },
    "bing-search": {
      "command": "node",
      "args": ["-r", "ts-node/register", "/workspace/MCP/bing-search-server/src/index.ts"],
      "env": {
        "BING_SEARCH_ENDPOINT": "https://api.bing.microsoft.com/",
        "BING_SEARCH_API_KEY": "d9e7712c6638410da3cd0c32ab46696d"
      },
      "disabled": false,
      "autoApprove": []
    },
    "reminder": {
      "command": "node",
      "args": ["-r", "ts-node/register", "/workspace/MCP/reminder-server/src/index.ts"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### TypeScript Execution Fix

Initially, we encountered issues with running TypeScript files directly using `npx ts-node`. The error was:

```
TypeError: Unknown file extension ".ts" for /workspace/MCP/bing-search-server/src/index.ts
```

To fix this, we changed the execution method to use Node.js with the ts-node register hook:

```json
"command": "node",
"args": ["-r", "ts-node/register", "/path/to/file.ts"]
```

This approach properly registers the TypeScript compiler with Node.js and allows direct execution of TypeScript files.

## Implementation Details

### Browserbase Server

The Browserbase server provides tools for browser automation:

- **browserbase_create_session**: Create a new cloud browser session
- **browserbase_navigate**: Navigate to any URL in the browser
- **browserbase_screenshot**: Capture screenshots of the entire page or specific elements
- **browserbase_click**: Click elements on the page
- **browserbase_fill**: Fill out input fields
- **browserbase_evaluate**: Execute JavaScript in the browser console
- **browserbase_get_content**: Extract all content from the current page
- **browserbase_close_session**: Close a browser session

### Reminder Server

The reminder server provides tools for managing reminders:

- **list_reminders**: List all reminders
- **create_reminder**: Create a new reminder with title, description, and due date
- **update_reminder**: Update an existing reminder's properties
- **delete_reminder**: Delete a reminder by ID

### Bing Search Server

The Bing search server provides tools for searching the web and browsing pages:

- **search**: Search the web using Bing Search API
  - Parameters:
    - `query`: Search query
    - `type`: Type of search (web, images, news)
    - `count`: Number of results to return

- **browse**: Browse a webpage using Puppeteer
  - Parameters:
    - `url`: URL to browse
    - `actions`: List of actions to perform on the webpage (click, type, scroll, screenshot)

## Git Configuration

To prevent MCP servers from being committed to the repository (as they contain sensitive API keys and are meant for local development only), the `.gitignore` file has been updated to exclude the entire `/MCP/` directory:

```
# MCP Servers - Local development servers that should not be committed
/MCP/
```

This ensures that:
1. Sensitive API keys are not accidentally committed
2. Each developer can set up their own MCP servers locally
3. The repository size is kept manageable by excluding development utilities

## Future Improvements

1. Add more robust error handling and logging
2. Implement caching for search results
3. Add more sophisticated browsing capabilities
4. Enhance security measures for API keys
5. Add more specialized MCP servers for other services
6. Enhance Browserbase integration with more advanced automation capabilities
