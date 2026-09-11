import React, { useState, useRef } from 'react';
import { API_BASE } from '../config';

export default function LiveSimulator({ victims = [], onMessageSent, onCallSent }) {
  const [selectedVictimId, setSelectedVictimId] = useState(victims[0]?.victim_id || 'VIC-RIYA-204');
  const [channel, setChannel] = useState('ivrs');
  const [messageText, setMessageText] = useState('The accused person got bail yesterday and I am feeling terrified.');
  
  // Real Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  // Behavioral Telemetry State
  const [missedCheckins, setMissedCheckins] = useState(2);
  const [responseLatency, setResponseLatency] = useState(16);

  // Simulation Sliders
  const [pitchVariance, setPitchVariance] = useState(8.5);
  const [pauseRatio, setPauseRatio] = useState(0.38);
  const [speakingRate, setSpeakingRate] = useState(80);

  const [isLoading, setIsLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  const samplePresets = [
    { label: 'Routine Stable', text: 'Thank you for following up, I am attending my legal aid consultation today.', channel: 'chatbot', missed: 0, latency: 1.5, pitch: 32.0 },
    { label: 'Fear & Threat', text: 'The accused person got bail and their relatives are threatening my family to withdraw the FIR.', channel: 'chatbot', missed: 1, latency: 8.0, pitch: 45.0 },
    { label: 'The Riya Crisis', text: 'I can\'t take this anymore. There is no point left for me. Nobody cares.', channel: 'ivrs', missed: 3, latency: 28.0, pitch: 6.8 },
    { label: 'Acute Self-Harm', text: 'I am going to end my life tonight, goodbye.', channel: 'chatbot', missed: 0, latency: 1.0, pitch: 10.0 }
  ];

  const applyPreset = (p) => {
    setMessageText(p.text);
    setChannel(p.channel);
    setMissedCheckins(p.missed);
    setResponseLatency(p.latency);
    setPitchVariance(p.pitch);
    setRecordedBlob(null);
    setRecordedAudioUrl(null);
  };

  // --- Real Live Microphone Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setRecordedAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setMessageText('');

      // Browser Speech Recognition for Live Transcription
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-IN';

        recognitionRef.current.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setMessageText(transcript);
        };
        recognitionRef.current.start();
      }
    } catch (err) {
      alert('Microphone access denied or not supported in this browser: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleRunSimulation = async () => {
    setIsLoading(true);
    setSimulationResult(null);

    try {
      if (recordedBlob && channel === 'ivrs') {
        const formData = new FormData();
        formData.append('victim_id', selectedVictimId);
        formData.append('audio_file', recordedBlob, 'live_call.webm');
        formData.append('browser_transcript', messageText);

        const res = await fetch(`${API_BASE}/upload-audio-call`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        setSimulationResult(data);
      } else if (channel === 'ivrs') {
        const payload = {
          victim_id: selectedVictimId,
          message_text: messageText,
          audio_metadata: {
            pitch_variance: parseFloat(pitchVariance),
            pause_ratio: parseFloat(pauseRatio),
            speaking_rate_wpm: parseInt(speakingRate)
          }
        };
        const res = await onCallSent(payload);
        setSimulationResult(res);
      } else {
        const payload = {
          victim_id: selectedVictimId,
          message_text: messageText,
          channel: channel,
          engagement_telemetry: {
            consecutive_missed_checkins: parseInt(missedCheckins),
            response_latency_hours: parseFloat(responseLatency),
            baseline_latency_hours: 2.0,
            days_since_last_checkin: parseInt(missedCheckins) * 2 + 1
          }
        };
        const res = await onMessageSent(payload);
        setSimulationResult(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-2xl">graphic_eq</span>
            <h2 className="text-xl font-bold text-on-surface tracking-tight">
              Interactive Multi-Channel & Live Voice Call Simulator
            </h2>
          </div>
          <p className="text-sm text-on-surface-variant">
            Test real-time microphone voice calls or synthetic telemetry to observe multi-agent analysis & risk tiering in real time.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <span className="material-symbols-outlined text-sm">psychology</span>
          LangGraph Multi-Agent Engine
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Sandbox */}
        <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">tune</span>
              Telemetry Input Sandbox
            </h3>
            <span className="text-xs text-on-surface-variant">Step 1 of 2</span>
          </div>

          {/* Target Victim Selector */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Select Registered Victim
            </label>
            <select
              value={selectedVictimId}
              onChange={(e) => setSelectedVictimId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              {victims.map((v) => (
                <option key={v.victim_id} value={v.victim_id}>
                  {v.name} ({v.victim_id}) — Stage: {v.case_stage} • Bail: {v.accused_bail_status}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Scenario Presets */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Quick Scenario Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {samplePresets.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs font-medium transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Communication Channel */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Communication Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ivrs', label: '14566 Voice Call', icon: 'phone_in_talk' },
                { id: 'chatbot', label: 'Web Chatbot', icon: 'chat' },
                { id: 'app', label: 'Mobile App', icon: 'smartphone' }
              ].map((c) => {
                const isSelected = channel === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChannel(c.id)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#022448] text-white border-[#022448] shadow-sm'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">{c.icon}</span>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real Microphone Call Box (For IVRS) */}
          {channel === 'ivrs' && (
            <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-700 text-base">mic</span>
                  Live Phone Call / Mic Recording
                </span>
                {isRecording && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    RECORDING CALL...
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-base">mic</span>
                    Speak Into Mic (Start Call)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-base">mic_off</span>
                    End Call & Process Audio
                  </button>
                )}
              </div>

              {recordedAudioUrl && (
                <div className="pt-2 border-t border-emerald-200/60 space-y-1">
                  <audio controls src={recordedAudioUrl} className="w-full h-8" />
                  <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    Real audio waveform captured & ready for acoustic prosody extraction.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Message / Audio Transcript Input */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              {channel === 'ivrs' ? 'Spoken Audio Transcript (ASR Output)' : 'Victim Text Message'}
            </label>
            <textarea
              rows={3}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Speak into microphone or type message text..."
              className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>

          {/* Telephony Sliders (Fallback / Simulation) */}
          {channel === 'ivrs' && !recordedBlob && (
            <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 space-y-2">
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">graphic_eq</span>
                Telephony Prosody Simulation Controls
              </span>
              <div>
                <div className="flex justify-between text-xs text-on-surface-variant font-medium mb-1">
                  <span>Pitch Flatness Variance: {pitchVariance} Hz</span>
                  <span className={pitchVariance < 10 ? "text-error font-bold" : "text-emerald-600 font-bold"}>
                    {pitchVariance < 10 ? '🔴 Depressive Flatness' : '🟢 Normal Expressive'}
                  </span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="50"
                  step="0.5"
                  value={pitchVariance}
                  onChange={(e) => setPitchVariance(e.target.value)}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Run Button */}
          <button
            type="button"
            onClick={handleRunSimulation}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-[#022448] hover:bg-[#1b3a60] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin">sync</span>
                Executing LangGraph Multi-Agent Engine...
              </span>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">bolt</span>
                Run Multi-Agent Prediction Pipeline
              </>
            )}
          </button>
        </div>

        {/* Right Column: Multi-Agent State & Decision Pipeline Output */}
        <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3 mb-4">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">smart_toy</span>
                Multi-Agent State & Decision Pipeline
              </h3>
              <span className="text-xs text-on-surface-variant">Real-time Telemetry</span>
            </div>

            {simulationResult ? (
              <div className="space-y-4">
                {/* Risk Tier & Fused Score Badge */}
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Assigned Risk Tier</span>
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        simulationResult.risk_tier === 'Urgent'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : simulationResult.risk_tier === 'Counselor Outreach'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        {simulationResult.risk_tier}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Fused Risk Score</span>
                    <p className={`text-2xl font-black ${
                      simulationResult.fused_risk_score >= 0.75
                        ? 'text-error'
                        : simulationResult.fused_risk_score >= 0.5
                        ? 'text-amber-600'
                        : 'text-primary'
                    }`}>
                      {(simulationResult.fused_risk_score * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* NLP Agent Card */}
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-1.5">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">psychology</span>
                    NLP Agent (Hugging Face RoBERTa GoEmotions)
                  </span>
                  {simulationResult.nlp_results ? (
                    <div className="text-xs text-on-surface space-y-1 pt-1">
                      <p className="flex justify-between">
                        <span className="text-on-surface-variant">Distress Severity:</span>
                        <strong className="font-semibold text-on-surface">{simulationResult.nlp_results.distress_severity}</strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-on-surface-variant">Top Emotions:</span>
                        <span className="font-semibold text-on-surface">
                          {simulationResult.nlp_results.top_emotions?.map(e => `${e.label} (${(e.score * 100).toFixed(0)}%)`).join(', ')}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-on-surface-variant italic">Voice prosody stream processed directly.</p>
                  )}
                </div>

                {/* Voice Prosody Agent Card */}
                {simulationResult.speech_results && (
                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-1.5">
                    <span className="text-xs font-bold text-secondary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">graphic_eq</span>
                      Voice Prosody Agent (Acoustics)
                    </span>
                    <div className="text-xs text-on-surface space-y-1 pt-1">
                      <p className="flex justify-between">
                        <span className="text-on-surface-variant">Tone Classification:</span>
                        <strong className="font-semibold text-on-surface">{simulationResult.speech_results.tone_label}</strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-on-surface-variant">Tone Distress Score:</span>
                        <strong className="font-semibold text-on-surface">{(simulationResult.speech_results.tone_distress_score * 100).toFixed(0)}%</strong>
                      </p>
                      {simulationResult.speech_results.prosodic_cues?.length > 0 && (
                        <p className="text-error font-medium text-[11px] pt-0.5">
                          Prosodic Cues: {simulationResult.speech_results.prosodic_cues.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Explainability Factors */}
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-2">
                  <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">analytics</span>
                    Decision Explainability Factors
                  </span>
                  <ul className="space-y-1 text-xs text-on-surface-variant">
                    {simulationResult.explainability_reasons?.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-emerald-600 text-xs mt-0.5">check_circle</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Alert Dispatched Banner */}
                {simulationResult.escalation_triggered && (
                  <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl flex items-center gap-3 text-red-800 text-xs font-semibold shadow-sm">
                    <span className="material-symbols-outlined text-red-600 text-lg">warning</span>
                    <div>
                      P1 Emergency Counselor Alert Dispatched to Sakhi One-Stop Center Dashboard!
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center space-y-3 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl text-outline-variant/60 animate-pulse">
                  graphic_eq
                </span>
                <p className="text-sm font-medium">
                  Click "Speak Into Mic (Start Call)" to talk in real time, or click "Run Multi-Agent Prediction Pipeline".
                </p>
              </div>
            )}
          </div>

          <div className="text-center border-t border-outline-variant/20 pt-3">
            <p className="text-[11px] text-on-surface-variant">
              🔒 Confidential & Compliant with DPDP Act 2023 • SC/ST (Prevention of Atrocities) Act Standard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
