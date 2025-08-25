'use client'

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Volume2, Save, TestTube } from "lucide-react"

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
  voiceState
}: SettingsDialogProps) {
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-cyan-500/50 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-cyan-400 text-xl">Jarvis Settings</DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure your voice assistant preferences
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* TTS Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">
              Text-to-Speech Configuration
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">TTS Engine</label>
                <Select value={ttsMode} onValueChange={onTTSModeChange}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">macOS System TTS (Fast)</SelectItem>
                    <SelectItem value="edge">Edge-TTS (High Quality)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Voice</label>
                <Select value={voice} onValueChange={onVoiceChange}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
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
              <label className="text-sm font-medium text-gray-300 mb-3 block">
                Speech Rate: {speechRate[0]} WPM
              </label>
              <div className="px-2">
                <Slider
                  value={speechRate}
                  onValueChange={onSpeechRateChange}
                  max={300}
                  min={100}
                  step={10}
                  className="w-full [&>span:first-child]:h-2 [&>span:first-child]:bg-cyan-500 [&_[role=slider]]:bg-cyan-400 [&_[role=slider]]:border-cyan-400 [&_[role=slider]]:w-5 [&_[role=slider]]:h-5 [&_[role=slider]]:border-2 [&>span:first-child>span]:bg-gray-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>100</span>
                  <span>200</span>
                  <span>300</span>
                </div>
              </div>
            </div>

            {/* Voice Testing */}
            <div className="flex space-x-2">
              <Button 
                onClick={onTestVoice}
                disabled={isSpeaking}
                variant="outline" 
                className="flex-1 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 cursor-pointer"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Test Voice
              </Button>
              
              <Button 
                onClick={onSaveSettings}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black cursor-pointer"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </div>

          {/* Voice Recognition Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">
              Voice Recognition
            </h3>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-300">Auto Voice Detection</label>
                <div className="text-xs text-gray-500">Automatically detect when you start/stop speaking</div>
              </div>
              <Switch
                checked={true}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-300">Continuous Listening</label>
                <div className="text-xs text-gray-500">Keep listening after each response</div>
              </div>
              <Switch
                checked={true}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>
          </div>

          {/* Animation Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">
              Animation & Visual Effects
            </h3>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-300">Real-time Audio Visualization</label>
                <div className="text-xs text-gray-500">Show blob animation while speaking</div>
              </div>
              <Switch
                checked={true}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-300">Voice State Indicators</label>
                <div className="text-xs text-gray-500">Show listening/processing/speaking states</div>
              </div>
              <Switch
                checked={true}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}