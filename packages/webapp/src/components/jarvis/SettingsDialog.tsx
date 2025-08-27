'use client'

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Volume2, Save, TestTube, Moon, Sun, Monitor, Mic } from "lucide-react"
import { useTheme } from "@/hooks/useTheme"

interface SettingsDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  ttsMode: 'system' | 'edge'
  onTTSModeChange: (mode: 'system' | 'edge') => void
  voice: string
  onVoiceChange: (voice: string) => void
  speechRate: number[]
  onSpeechRateChange: (rate: number[]) => void
  availableVoices: string[]
  onTestVoice: () => void
  onSaveSettings: () => void
  isSpeaking: boolean
  voiceState: string
  wakeWordEnabled: boolean
  onWakeWordEnabledChange: (enabled: boolean) => void
  autoVoiceDetection: boolean
  onAutoVoiceDetectionChange: (enabled: boolean) => void
  continuousListening: boolean
  onContinuousListeningChange: (enabled: boolean) => void
  microphoneGain: number[]
  onMicrophoneGainChange: (gain: number[]) => void
}

export function SettingsDialog({
  isOpen,
  onOpenChange,
  ttsMode,
  onTTSModeChange,
  voice,
  onVoiceChange,
  speechRate,
  onSpeechRateChange,
  availableVoices,
  onTestVoice,
  onSaveSettings,
  isSpeaking,
  voiceState,
  wakeWordEnabled,
  onWakeWordEnabledChange,
  autoVoiceDetection,
  onAutoVoiceDetectionChange,
  continuousListening,
  onContinuousListeningChange,
  microphoneGain,
  onMicrophoneGainChange
}: SettingsDialogProps) {
  const { theme, setTheme } = useTheme()
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-foreground text-xl">Jarvis Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure your voice assistant preferences
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {/* Theme Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
              Appearance
            </h3>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => setTheme('light')}
                  className="flex flex-col items-center gap-2 h-auto p-4"
                >
                  <Sun className="w-4 h-4" />
                  <span className="text-xs">Light</span>
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => setTheme('dark')}
                  className="flex flex-col items-center gap-2 h-auto p-4"
                >
                  <Moon className="w-4 h-4" />
                  <span className="text-xs">Dark</span>
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  onClick={() => setTheme('system')}
                  className="flex flex-col items-center gap-2 h-auto p-4"
                >
                  <Monitor className="w-4 h-4" />
                  <span className="text-xs">System</span>
                </Button>
              </div>
            </div>
          </div>
          {/* TTS Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
              Text-to-Speech Configuration
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">TTS Engine</label>
                <Select value={ttsMode} onValueChange={onTTSModeChange}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">macOS System TTS (Fast)</SelectItem>
                    <SelectItem value="edge">Edge-TTS (High Quality)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Voice</label>
                <Select value={voice} onValueChange={onVoiceChange}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ttsMode === 'system' ? (
                      <>
                        <SelectItem value="Alex">Alex (Male)</SelectItem>
                        <SelectItem value="Samantha">Samantha (Female)</SelectItem>
                        <SelectItem value="Victoria">Victoria (Female)</SelectItem>
                        <SelectItem value="Daniel">Daniel (Male)</SelectItem>
                      </>
                    ) : (
                      // Edge TTS voices from server
                      availableVoices.length > 0 ? (
                        availableVoices.map((voiceName) => {
                          const voiceLabels: Record<string, string> = {
                            'en-US-AriaNeural': 'Aria (Female, News)',
                            'en-US-JennyNeural': 'Jenny (Female, Assistant)',
                            'en-US-GuyNeural': 'Guy (Male, News)',
                            'en-US-AndrewNeural': 'Andrew (Male, Conversation)',
                            'en-US-BrianNeural': 'Brian (Male, Conversation)',
                            'en-US-EmmaNeural': 'Emma (Female, Conversation)',
                            'en-GB-LibbyNeural': 'Libby (Female, British)',
                            'en-GB-RyanNeural': 'Ryan (Male, British)',
                          };
                          return (
                            <SelectItem key={voiceName} value={voiceName}>
                              {voiceLabels[voiceName] || voiceName}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem value={voice}>Loading voices...</SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Speech Rate Slider */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">
                Speech Rate: {speechRate[0]} WPM
              </label>
              <div className="px-2">
                <Slider
                  value={speechRate}
                  onValueChange={onSpeechRateChange}
                  max={300}
                  min={100}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>100</span>
                  <span>200</span>
                  <span>300</span>
                </div>
              </div>
            </div>

            {/* Voice Testing */}
            <div className="flex justify-center">
              <Button 
                onClick={onTestVoice}
                disabled={isSpeaking}
                variant="outline" 
                className="cursor-pointer"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Test Voice
              </Button>
            </div>
          </div>

          {/* Voice Recognition Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
              Voice Recognition
            </h3>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Wake Word Detection</label>
                <div className="text-xs text-muted-foreground">Say &quot;Hey Jarvis&quot; to activate voice mode</div>
              </div>
              <Switch
                checked={wakeWordEnabled}
                onCheckedChange={onWakeWordEnabledChange}
              />
            </div>
            
            {wakeWordEnabled && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground">Auto Voice Detection</label>
                    <div className="text-xs text-muted-foreground">Automatically detect when you start/stop speaking</div>
                  </div>
                  <Switch
                    checked={autoVoiceDetection}
                    onCheckedChange={onAutoVoiceDetectionChange}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground">Continuous Listening</label>
                    <div className="text-xs text-muted-foreground">Keep listening after each response</div>
                  </div>
                  <Switch
                    checked={continuousListening}
                    onCheckedChange={onContinuousListeningChange}
                  />
                </div>
                
                {/* Microphone Gain Slider */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Microphone Gain: {microphoneGain?.[0] ?? 2.0}x
                  </label>
                  <div className="text-xs text-muted-foreground mb-3">
                    Boost microphone sensitivity for better wake word detection from distance
                  </div>
                  <div className="px-2">
                    <Slider
                      value={microphoneGain || [2.0]}
                      onValueChange={onMicrophoneGainChange}
                      max={4.0}
                      min={0.5}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Animation Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
              Animation & Visual Effects
            </h3>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Real-time Audio Visualization</label>
                <div className="text-xs text-muted-foreground">Show blob animation while speaking</div>
              </div>
              <Switch
                checked={true}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Voice State Indicators</label>
                <div className="text-xs text-muted-foreground">Show listening/processing/speaking states</div>
              </div>
              <Switch
                checked={true}
              />
            </div>
          </div>
        </div>
        
        {/* Auto-save indicator */}
        <div className="flex-shrink-0 border-t border-border pt-4 mt-4">
          <div className="text-center text-sm text-muted-foreground">
            <Save className="w-4 h-4 inline mr-2" />
            Settings are automatically saved
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}