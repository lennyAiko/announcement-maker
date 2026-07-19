import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import AudioUploadStep from './components/AudioUploadStep';
import BackgroundStyleStep from './components/BackgroundStyleStep';
import CaptionsStep from './components/CaptionsStep';
import ExportProgressModal from './components/ExportProgressModal';
import PreviewExportStep from './components/PreviewExportStep';
import ScriptStep from './components/ScriptStep';
import { useBackgroundStyle } from './hooks/useBackgroundStyle';
import { useCanvasPreview } from './hooks/useCanvasPreview';
import { useCaptions } from './hooks/useCaptions';
import { useExportRecorder } from './hooks/useExportRecorder';
import { useNarrationAudio } from './hooks/useNarrationAudio';
import {
  currentCaptionAt,
  formatTime,
  getDurationMismatch,
  splitIntoChunks,
} from './lib/captions';
import { DEFAULT_CAPTION_GAP } from './lib/constants';
import { clearState, loadState, saveState } from './lib/persistence';

const START_PAD = DEFAULT_CAPTION_GAP;
const END_PAD = DEFAULT_CAPTION_GAP;
const initialSaved = loadState();

const App = () => {
  const [scriptText, setScriptText] = useState(
    () => initialSaved?.scriptText ?? '',
  );
  const [genStatus, setGenStatus] = useState(() => {
    if (initialSaved?.audioFileName) {
      return {
        tone: 'ok',
        message: `Restored previous session (audio: ${initialSaved.audioFileName}). Re-upload audio if needed.`,
      };
    }
    return null;
  });
  const [exportStatus, setExportStatus] = useState(null);

  const {
    audioRef,
    scrubInputRef,
    fileName,
    duration: audioDuration,
    isPlaying,
    currentTime,
    timeLabel,
    waveformPeaks,
    loadFile,
    togglePlay,
    seek,
    beginScrub,
    endScrub,
  } = useNarrationAudio();

  const {
    videoElRef,
    imageRef,
    bgType,
    setBgType,
    bgColor,
    setBgColor,
    textColor,
    setTextColor,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    textPosition,
    setTextPosition,
    resolution,
    setResolution,
    speakingPace,
    setSpeakingPace,
    isImageReady,
    isVideoReady,
    loadImageFile,
    loadVideoFile,
    seekVideoToAudioTime,
  } = useBackgroundStyle(isPlaying);

  const {
    captions,
    generate,
    distributeEvenly,
    updateDuration,
    deleteCaption,
    moveCaption,
    tapState,
    startTapMode,
    recordTap,
    cancelTapMode,
  } = useCaptions();

  const gap = DEFAULT_CAPTION_GAP;
  const prevTapActiveRef = useRef(false);

  const activeCaptionId = useMemo(() => {
    if (!audioDuration || captions.length === 0) return null;
    const result = currentCaptionAt(captions, currentTime, gap, START_PAD);
    return result.index >= 0 ? captions[result.index]?.id : null;
  }, [captions, currentTime, audioDuration, gap]);

  const { canvasRef, redrawNow } = useCanvasPreview({
    audioRef,
    videoElRef,
    imageRef,
    bgType,
    bgColor,
    textColor,
    fontSize,
    fontFamily,
    textPosition,
    isImageReady,
    isVideoReady,
    captions,
    isPlaying,
    gap,
  });

  const handleExportStatus = useCallback((tone, message) => {
    setExportStatus({ tone, message });
  }, []);

  const { isExporting, downloadUrl, progress: exportProgress, startExport } = useExportRecorder({
    audioRef,
    videoElRef,
    bgType,
    canvasRef,
    resolution,
    onStatus: handleExportStatus,
  });

  const handleClearSession = () => {
    clearState();
    setScriptText('');
    setGenStatus({ tone: 'ok', message: 'Session cleared.' });
  };

  const handleGenerate = () => {
    const result = generate(scriptText, audioDuration, {
      pace: speakingPace,
      gap,
      startPad: START_PAD,
      endPad: END_PAD,
    });
    setGenStatus({ tone: result.ok ? 'ok' : 'warn', message: result.message });
  };

  const handleDistributeEvenly = () => {
    distributeEvenly(audioDuration, {
      pace: speakingPace,
      gap,
      startPad: START_PAD,
      endPad: END_PAD,
    });
  };

  const handleDurationChange = (id, value) => {
    updateDuration(id, value);
    const nextCaptions = captions.map((c) =>
      c.id === id ? { ...c, duration: value } : c,
    );
    const mismatch = getDurationMismatch(
      nextCaptions,
      audioDuration,
      gap,
      START_PAD,
      END_PAD,
    );
    if (mismatch) {
      setGenStatus({
        tone: 'warn',
        message: `Caption lines + gaps + padding total ${formatTime(mismatch.total)}, audio is ${formatTime(
          mismatch.audioDuration,
        )}. They don't need to match exactly, but a big gap means captions will run past the end (or finish early).`,
      });
    }
  };

  const handleDeleteCaption = (id) => {
    deleteCaption(id);
  };

  const handleMoveUp = (id) => {
    moveCaption(id, -1);
  };

  const handleMoveDown = (id) => {
    moveCaption(id, 1);
  };

  const handleStartTap = () => {
    const chunks = splitIntoChunks(scriptText);
    if (chunks.length === 0) {
      setGenStatus({
        tone: 'warn',
        message: 'Paste the announcement text first.',
      });
      return;
    }
    startTapMode(chunks);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play();
    }
  };

  const handleRecordTap = () => {
    const audio = audioRef.current;
    if (!audio || !tapState?.active) return;
    recordTap(audio.currentTime);
  };

  const handleRecordTapRef = useRef(handleRecordTap);
  const togglePlayRef = useRef(togglePlay);
  const tapActiveRef = useRef(false);

  const handleCancelTap = () => {
    cancelTapMode();
    const audio = audioRef.current;
    if (audio) audio.pause();
  };

  const handleScrubInput = (e) => {
    beginScrub();
    const t = Number(e.target.value) / 1000;
    seek(t);
    seekVideoToAudioTime(t);
    redrawNow();
  };

  const handleScrubCommit = () => endScrub();

  // --- restore saved style settings ---
  useEffect(() => {
    if (!initialSaved) return;
    if (initialSaved.bgType) setBgType(initialSaved.bgType);
    if (initialSaved.bgColor) setBgColor(initialSaved.bgColor);
    if (initialSaved.textColor) setTextColor(initialSaved.textColor);
    if (initialSaved.fontSize) setFontSize(initialSaved.fontSize);
    if (initialSaved.fontFamily) setFontFamily(initialSaved.fontFamily);
    if (initialSaved.textPosition) setTextPosition(initialSaved.textPosition);
    if (initialSaved.resolution) setResolution(initialSaved.resolution);
    if (initialSaved.speakingPace) setSpeakingPace(initialSaved.speakingPace);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- sync refs for keyboard handler ---
  useEffect(() => {
    handleRecordTapRef.current = handleRecordTap;
    togglePlayRef.current = togglePlay;
    tapActiveRef.current = tapState?.active ?? false;
  });

  // --- localStorage save on changes ---
  useEffect(() => {
    saveState({
      scriptText,
      captions,
      bgType,
      bgColor,
      textColor,
      fontSize,
      fontFamily,
      textPosition,
      resolution,
      speakingPace,
      audioFileName: fileName,
      audioDuration,
    });
  }, [
    scriptText,
    captions,
    bgType,
    bgColor,
    textColor,
    fontSize,
    fontFamily,
    textPosition,
    resolution,
    speakingPace,
    fileName,
    audioDuration,
  ]);

  // --- tap-to-time: pause audio when tap mode auto-finishes ---
  useEffect(() => {
    const wasActive = prevTapActiveRef.current;
    prevTapActiveRef.current = tapState?.active ?? false;
    if (wasActive && !tapState?.active && audioRef.current) {
      audioRef.current.pause();
    }
  }, [tapState, audioRef]);

  // --- keyboard: Space to play/pause or record tap ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT'
      )
        return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (tapActiveRef.current) {
          handleRecordTapRef.current();
        } else {
          togglePlayRef.current();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 pb-20">
      <header className="mb-8">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-widest text-gold-dark">
            COJAG announcements
          </div>
          <button
            type="button"
            onClick={handleClearSession}
            className="rounded-md border border-line px-2.5 py-1 text-[11px] text-ink-soft hover:border-gold hover:text-ink"
          >
            Clear session
          </button>
        </div>
        <h1 className="mb-2 font-serif text-[32px] font-normal text-ink">
          Announcement Video Maker
        </h1>
        <p className="max-w-[560px] text-[15px] leading-relaxed text-ink-soft">
          Paste the script, drop in the audio from luvvoice, and get a captioned
          video — no CapCut required. Works from any device, in the browser.
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <ScriptStep value={scriptText} onChange={setScriptText} />
          <AudioUploadStep
            fileName={fileName}
            duration={audioDuration}
            onFileSelected={loadFile}
          />
          <CaptionsStep
            captions={captions}
            status={genStatus}
            canGenerate={audioDuration > 0}
            onGenerate={handleGenerate}
            onDistributeEvenly={handleDistributeEvenly}
            onDurationChange={handleDurationChange}
            activeCaptionId={activeCaptionId}
            onDelete={handleDeleteCaption}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            waveformPeaks={waveformPeaks}
            currentTime={currentTime}
            audioDuration={audioDuration}
            gap={gap}
            startPad={START_PAD}
            tapState={tapState}
            onStartTap={handleStartTap}
            onRecordTap={handleRecordTap}
            onCancelTap={handleCancelTap}
          />
          <BackgroundStyleStep
            bgType={bgType}
            setBgType={setBgType}
            bgColor={bgColor}
            setBgColor={setBgColor}
            textColor={textColor}
            setTextColor={setTextColor}
            fontSize={fontSize}
            setFontSize={setFontSize}
            fontFamily={fontFamily}
            setFontFamily={setFontFamily}
            textPosition={textPosition}
            setTextPosition={setTextPosition}
            resolution={resolution}
            setResolution={setResolution}
            speakingPace={speakingPace}
            setSpeakingPace={setSpeakingPace}
            onImageFile={loadImageFile}
            onVideoFile={loadVideoFile}
          />
        </div>

        <PreviewExportStep
          canvasRef={canvasRef}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          scrubInputRef={scrubInputRef}
          onScrubInput={handleScrubInput}
          onScrubCommit={handleScrubCommit}
          timeLabel={timeLabel}
          hasAudio={audioDuration > 0}
          canExport={captions.length > 0}
          isExporting={isExporting}
          onExport={startExport}
          downloadUrl={downloadUrl}
          exportStatus={exportStatus}
          resolution={resolution}
        />
      </div>

      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" hidden />
      <video ref={videoElRef} muted playsInline loop hidden />

      <ExportProgressModal
        open={isExporting}
        progress={exportProgress}
        message={exportStatus?.tone !== 'warn' ? exportStatus?.message : null}
      />
    </div>
  );
};

export default App;
