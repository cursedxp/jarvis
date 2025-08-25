#!/bin/bash

# Jarvis Boot Agent Installation Script for macOS/Linux

JARVIS_PATH="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_NAME="com.jarvis.agent"

echo "Installing Jarvis boot agent..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS LaunchAgent
    PLIST_PATH="$HOME/Library/LaunchAgents/$AGENT_NAME.plist"
    
    cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$AGENT_NAME</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$JARVIS_PATH/packages/core/dist/index.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>$JARVIS_PATH/logs/jarvis-error.log</string>
    <key>StandardOutPath</key>
    <string>$JARVIS_PATH/logs/jarvis-output.log</string>
    <key>WorkingDirectory</key>
    <string>$JARVIS_PATH</string>
</dict>
</plist>
EOF
    
    launchctl load "$PLIST_PATH"
    echo "LaunchAgent installed at: $PLIST_PATH"
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux systemd service
    SERVICE_PATH="/etc/systemd/system/jarvis.service"
    
    sudo cat > "$SERVICE_PATH" << EOF
[Unit]
Description=Jarvis AI Assistant
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$JARVIS_PATH
ExecStart=/usr/bin/node $JARVIS_PATH/packages/core/dist/index.js
Restart=always
RestartSec=10
StandardOutput=append:$JARVIS_PATH/logs/jarvis-output.log
StandardError=append:$JARVIS_PATH/logs/jarvis-error.log

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable jarvis.service
    sudo systemctl start jarvis.service
    echo "Systemd service installed at: $SERVICE_PATH"
fi

echo "Boot agent installation complete!"
echo "Jarvis will now start automatically on system boot."