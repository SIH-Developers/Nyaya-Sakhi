import React, { useState, useRef } from 'react';
import { 
  Play, MessageSquare, PhoneCall, Sliders, CheckCircle2, 
  AlertTriangle, ArrowRight, Zap, Mic, MicOff, Radio, Globe 
} from 'lucide-react';
import { API_BASE } from '../config';

export default function LiveSimulator({ victims, onMessageSent, onCallSent }) {
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

      // Optional Browser Speech Recognition for Live Transcription
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
      // If we have a real recorded audio blob, upload it via multipart form
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
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
          Interactive Multi-Channel & Live Voice Call Simulator
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Test the system with real-time microphone voice calls or synthetic telemetry to observe multi-agent analysis in real time
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px' }}>
        {/* Left: Input Sandbox */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          {/* Target Victim Selector */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Select Registered Victim:
            </label>
            <select
              value={selectedVictimId}
              onChange={(e) => setSelectedVictimId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            >
              {victims.map((v) => (
                <option key={v.victim_id} value={v.victim_id} style={{ background: '#111726' }}>
                  {v.name} ({v.victim_id}) — {v.case_stage} • Bail: {v.accused_bail_status}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Presets */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Quick Scenario Presets:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {samplePresets.map((p, i) => (
                <button
                  key={i}
                  onClick={() => applyPreset(p)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Channel Selector */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Communication Channel:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'ivrs', label: '14566 IVRS Voice Call', icon: PhoneCall },
                { id: 'chatbot', label: 'Web Chatbot', icon: MessageSquare },
                { id: 'app', label: 'Mobile App', icon: MessageSquare }
              ].map((c) => {
                const Icon = c.icon;
                const isSelected = channel === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setChannel(c.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={14} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real Microphone Call Button (For IVRS) */}
          {channel === 'ivrs' && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Radio size={16} color="#6366f1" />
                  Live Phone Call / Mic Recording:
                </span>
                {isRecording && (
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="pulse-dot" style={{ background: '#ef4444' }}></span> RECORDING CALL...
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="btn btn-primary"
                    style={{ flex: 1, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                  >
                    <Mic size={16} /> Speak Into Mic (Start Call)
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                  >
                    <MicOff size={16} /> End Call & Process Audio
                  </button>
                )}
              </div>

              {recordedAudioUrl && (
                <div style={{ marginTop: '12px' }}>
                  <audio controls src={recordedAudioUrl} style={{ width: '100%', height: '36px' }} />
                  <p style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>
                    ✅ Real audio waveform ready for acoustic prosody extraction.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Message / Audio Transcript Input */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              {channel === 'ivrs' ? 'Spoken Audio Transcript (ASR Output):' : 'Victim Text Message:'}
            </label>
            <textarea
              rows={3}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Speak into microphone or type message text..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                fontSize: '0.85rem',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          {/* Telephony Sliders (Fallback / Simulation) */}
          {channel === 'ivrs' && !recordedBlob && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                🎙️ Telephony Prosody Simulation:
              </span>
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Pitch Flatness (Variance): {pitchVariance} Hz</span>
                  <span>{pitchVariance < 10 ? '🔴 Depressive Flatness' : '🟢 Normal Expressive'}</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="50"
                  step="0.5"
                  value={pitchVariance}
                  onChange={(e) => setPitchVariance(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* Run Button */}
          <button
            onClick={handleRunSimulation}
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }}
          >
            {isLoading ? (
              <span>⚡ Executing LangGraph Multi-Agent Engine...</span>
            ) : (
              <>
                <Zap size={18} /> Run Multi-Agent Prediction Pipeline
              </>
            )}
          </button>
        </div>

        {/* Right: Real-time Multi-Agent Output Display */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
            Multi-Agent State & Decision Pipeline
          </h3>

          {simulationResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Risk Tier Badge Result */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Risk Tier</span>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`badge ${simulationResult.risk_tier === 'Urgent' ? 'badge-urgent' : simulationResult.risk_tier === 'Counselor Outreach' ? 'badge-outreach' : 'badge-watch'}`} style={{ fontSize: '0.85rem' }}>
                      {simulationResult.risk_tier}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fused Risk Score</span>
                  <p style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: simulationResult.fused_risk_score >= 0.75 ? 'var(--urgent-red)' : simulationResult.fused_risk_score >= 0.5 ? 'var(--outreach-amber)' : 'var(--watch-blue)',
                    fontFamily: 'var(--font-display)'
                  }}>
                    {(simulationResult.fused_risk_score * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Individual Agent Output Cards */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                  🤖 NLP Agent (Hugging Face RoBERTa GoEmotions):
                </span>
                {simulationResult.nlp_results ? (
                  <div style={{ marginTop: '6px', fontSize: '0.8rem' }}>
                    <p>Distress Severity: <strong style={{ color: '#ffffff' }}>{simulationResult.nlp_results.distress_severity}</strong></p>
                    <p>Emotions: {simulationResult.nlp_results.top_emotions.map(e => `${e.label} (${(e.score * 100).toFixed(0)}%)`).join(', ')}</p>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Voice Prosody Stream Processed</p>
                )}
              </div>

              {/* Acoustic Prosody Real-Time Stats */}
              {simulationResult.speech_results && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    🎙️ Voice Prosody Agent (Acoustics):
                  </span>
                  <div style={{ marginTop: '6px', fontSize: '0.8rem' }}>
                    <p>Tone Classification: <strong style={{ color: '#ffffff' }}>{simulationResult.speech_results.tone_label}</strong></p>
                    <p>Tone Distress Score: <strong>{(simulationResult.speech_results.tone_distress_score * 100).toFixed(0)}%</strong></p>
                    {simulationResult.speech_results.prosodic_cues?.length > 0 && (
                      <p style={{ color: '#fca5a5' }}>Cues: {simulationResult.speech_results.prosodic_cues.join(', ')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Explainability Reasons */}
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                  🔍 Decision Explainability Factors:
                </span>
                <ul style={{ marginTop: '8px', paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {simulationResult.explainability_reasons && simulationResult.explainability_reasons.map((r, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{r}</li>
                  ))}
                </ul>
              </div>

              {/* Alert Dispatched Banner */}
              {simulationResult.escalation_triggered && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#fca5a5',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}>
                  <AlertTriangle size={18} />
                  P1 Emergency Counselor Alert Dispatched to District Dashboard!
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Zap size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem' }}>Click "Speak Into Mic (Start Call)" to talk in real time, or click "Run Multi-Agent Prediction Pipeline".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
