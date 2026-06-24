import { useState, useEffect, useRef } from 'react';

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const supported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  useEffect(() => {
    if (!supported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    
    // We set continuous false to detect natural pauses and auto-stop for short commands,
    // which operates elegantly for prompt commands like "create a task..."
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    rec.onresult = (event: any) => {
      let finalStr = '';
      let interimStr = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalStr += event.results[i][0].transcript;
        } else {
          interimStr += event.results[i][0].transcript;
        }
      }

      if (finalStr) {
        setTranscript(prev => prev + (prev ? ' ' : '') + finalStr);
      }
      setInterimTranscript(interimStr);
    };

    rec.onerror = (event: any) => {
      console.warn('Speech recognition warning:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Let NexTask access your mic in site settings.');
      } else if (event.error === 'audio-capture') {
        setError('No speech input detected. Verify your microphone connects.');
      } else if (event.error === 'no-speech') {
        // Natural timeout, no-op
      } else {
        setError(event.error);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [supported]);

  const startListening = () => {
    if (!supported) {
      setError('Speech Recognition is not supported by this browser. Try Chrome/Safari.');
      return;
    }
    
    if (!recognitionRef.current) return;
    
    try {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      recognitionRef.current.start();
    } catch (err: any) {
      console.error("Failed starting speech recognition:", err);
    }
  };

  const stopListening = () => {
    if (!supported || !recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (err: any) {
      console.error("Failed stopping speech recognition:", err);
    }
  };

  const resetTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  };

  return {
    isListening,
    transcript,
    interimTranscript,
    supported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
