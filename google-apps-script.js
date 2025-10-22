// Google Apps Script - Comprehensive Analytics Handler
// 
// SETUP INSTRUCTIONS:
// 1. Create a new Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Delete any existing code
// 4. Paste ALL of this code
// 5. Save (Ctrl+S or File > Save)
// 6. Click Deploy > New deployment
// 7. Select "Web app"
// 8. Set "Execute as" to "Me"
// 9. Set "Who has access" to "Anyone"
// 10. Click Deploy and copy the URL
// 11. Update GOOGLE_SCRIPT_URL in static/analytics.js with your URL

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Setup headers on first run
    if (sheet.getLastRow() === 0) {
      setupHeaders();
    }
    
    // Flatten nested objects for Google Sheets
    const rowData = [
      // Basic Info
      data.timestamp,
      data.sessionId,
      
      // User Identification
      data.userIdentification.userId || 'N/A',
      data.userIdentification.fingerprintId || 'N/A',
      data.userIdentification.isNewUser || false,
      data.userIdentification.isReturningUser || false,
      data.userIdentification.visitCount || 1,
      data.userIdentification.firstVisit || 'N/A',
      data.userIdentification.lastVisit || 'N/A',
      data.userIdentification.daysSinceLastVisit || 0,
      data.userIdentification.userIdMatch || false,
      
      // Page Info
      data.page.url,
      data.page.title,
      data.page.referrer,
      data.page.protocol,
      data.page.hostname,
      data.page.pathname,
      
      // Browser Info
      data.browser.name,
      data.browser.version,
      data.browser.engine,
      data.browser.cookiesEnabled,
      data.browser.doNotTrack,
      data.browser.onLine,
      
      // Device Info
      data.device.type,
      data.device.platform,
      data.device.maxTouchPoints,
      data.device.hardwareConcurrency,
      data.device.deviceMemory,
      data.device.devicePixelRatio,
      data.device.orientation,
      
      // Screen Info
      `${data.screen.width}x${data.screen.height}`,
      data.screen.colorDepth,
      data.screen.devicePixelRatio,
      data.screen.orientation,
      `${data.screen.windowSize.innerWidth}x${data.screen.windowSize.innerHeight}`,
      
      // OS Info
      data.os.name,
      data.os.version,
      data.os.architecture,
      
      // Connection Info
      data.connection.effectiveType || 'N/A',
      data.connection.downlink || 'N/A',
      data.connection.rtt || 'N/A',
      data.connection.saveData || 'N/A',
      
      // Geolocation
      data.geolocation.ip || 'N/A',
      data.geolocation.city || 'N/A',
      data.geolocation.region || 'N/A',
      data.geolocation.country || 'N/A',
      data.geolocation.countryCode || 'N/A',
      data.geolocation.latitude || 'N/A',
      data.geolocation.longitude || 'N/A',
      data.geolocation.timezone || 'N/A',
      data.geolocation.isp || 'N/A',
      data.geolocation.asn || 'N/A',
      data.geolocation.currency || 'N/A',
      
      // Locale
      data.locale.language,
      data.locale.timeZone,
      (data.locale.languages || []).join(', '),
      
      // Keyboard
      data.keyboard.detected,
      
      // Performance
      data.performance.loadTime || 'N/A',
      data.performance.domReadyTime || 'N/A',
      data.performance.navigationType || 'N/A',
      
      // Battery
      data.battery.level || 'N/A',
      data.battery.charging || 'N/A',
      
      // Media
      data.media.getUserMedia || false,
      data.media.webrtc || false,
      JSON.stringify(data.media.videoFormats || {}),
      
      // Graphics
      data.graphics.webgl || false,
      data.graphics.vendor || 'N/A',
      data.graphics.renderer || 'N/A',
      data.graphics.version || 'N/A',
      
      // Plugins
      data.plugins.count || 0,
      JSON.stringify(data.plugins.plugins || []),
      
      // Storage
      data.storage.localStorage || false,
      data.storage.indexedDB || false,
      data.storage.serviceWorker || false,
      
      // Security
      data.security.https || false,
      data.security.doNotTrack || 'N/A',
      data.security.webdriver || false,
      
      // Time Info
      data.timeInfo.localTime,
      data.timeInfo.utcTime,
      data.timeInfo.timezone,
      data.timeInfo.timezoneOffset,
      
      // User Agent Details
      data.userAgentDetails.isMobile || false,
      data.userAgentDetails.isTablet || false,
      data.userAgentDetails.isDesktop || false,
      data.userAgentDetails.isBot || false,
      
      // Fingerprints
      data.canvasFingerprint || 'N/A',
      data.audioFingerprint.fingerprint || 'N/A',
      
      // WebRTC
      (data.webrtc.localIPs || []).join(', ') || 'N/A',
      
      // Fonts
      data.fonts.count || 0,
      (data.fonts.installed || []).join(', '),
      
      // Sensors
      JSON.stringify(data.sensors || {})
    ];
    
    // Append the data to the sheet
    sheet.appendRow(rowData);
    
    // Auto-resize columns periodically
    if (sheet.getLastRow() % 10 === 0) {
      sheet.autoResizeColumns(1, Math.min(sheet.getLastColumn(), 30));
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Comprehensive analytics data saved successfully',
      rowNumber: sheet.getLastRow()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'Comprehensive Analytics endpoint is working',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// Function to setup headers automatically
function setupHeaders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = [
    // Basic Info
    'Timestamp', 'Session ID',
    
    // User Identification
    'User ID', 'Fingerprint ID', 'Is New User', 'Is Returning User', 'Visit Count', 
    'First Visit', 'Last Visit', 'Days Since Last Visit', 'ID Match',
    
    // Page Info
    'URL', 'Page Title', 'Referrer', 'Protocol', 'Hostname', 'Pathname',
    
    // Browser Info
    'Browser', 'Browser Version', 'Engine', 'Cookies Enabled', 'Do Not Track', 'Online',
    
    // Device Info
    'Device Type', 'Platform', 'Max Touch Points', 'CPU Cores', 'Device Memory (GB)', 'Pixel Ratio', 'Orientation',
    
    // Screen Info
    'Screen Resolution', 'Color Depth', 'Device Pixel Ratio', 'Screen Orientation', 'Window Size',
    
    // OS Info
    'OS', 'OS Version', 'Architecture',
    
    // Connection Info
    'Connection Type', 'Download Speed (Mbps)', 'RTT (ms)', 'Save Data',
    
    // Geolocation
    'IP Address', 'City', 'Region', 'Country', 'Country Code', 'Latitude', 'Longitude', 'Timezone', 'ISP', 'ASN', 'Currency',
    
    // Locale
    'Language', 'Timezone', 'Languages', 
    
    // Keyboard
    'Keyboard Layout',
    
    // Performance
    'Load Time (ms)', 'DOM Ready Time (ms)', 'Navigation Type',
    
    // Battery
    'Battery Level', 'Charging',
    
    // Media
    'Has Camera/Mic', 'Has WebRTC', 'Video Formats',
    
    // Graphics
    'WebGL Enabled', 'GPU Vendor', 'GPU Renderer', 'WebGL Version',
    
    // Plugins
    'Plugin Count', 'Plugins List',
    
    // Storage
    'LocalStorage', 'IndexedDB', 'Service Worker',
    
    // Security
    'HTTPS', 'Do Not Track', 'Webdriver',
    
    // Time Info
    'Local Time', 'UTC Time', 'Timezone', 'Timezone Offset',
    
    // User Agent Details
    'Is Mobile', 'Is Tablet', 'Is Desktop', 'Is Bot',
    
    // Fingerprints
    'Canvas Fingerprint', 'Audio Fingerprint',
    
    // WebRTC
    'Local IPs',
    
    // Fonts
    'Fonts Count', 'Installed Fonts',
    
    // Sensors
    'Available Sensors'
  ];
  
  // Set headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285F4');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  
  // Auto-resize all columns
  sheet.autoResizeColumns(1, headers.length);
  
  Logger.log('✅ Headers setup complete! Total columns: ' + headers.length);
}

// Optional: Manually run this to setup/reset headers
// Go to: Run > Run function > setupHeaders
