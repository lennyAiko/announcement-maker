import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import AudioUploadStep from './components/AudioUploadStep';
import BackgroundStyleStep from './components/BackgroundStyleStep';
import CaptionsStep from './components/CaptionsStep';
import ExportProgressModal from './components/ExportProgressModal';
import IntroVideoStep from './components/IntroVideoStep';
import PreviewExportStep from './components/PreviewExportStep';
import ScriptStep from './components/ScriptStep';
import { useBackgroundStyle } from './hooks/useBackgroundStyle';
import { useCanvasPreview } from './hooks/useCanvasPreview';
import { useCaptions } from './hooks/useCaptions';
import { useExportRecorder } from './hooks/useExportRecorder';
import { useIntroVideo } from './hooks/useIntroVideo';
import { useNarrationAudio } from './hooks/useNarrationAudio';
import {
  currentCaptionAt,
  formatTime,
  getDurationMismatch,
  splitIntoChunks,
} from './lib/captions';
import {
  DEFAULT_BG_COLOR,
  DEFAULT_CAPTION_GAP,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_PACE,
  DEFAULT_RESOLUTION,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_POSITION,
} from './lib/constants';
import {
  clearMedia,
  clearState,
  loadMedia,
  loadState,
  saveMedia,
  saveState,
} from './lib/persistence';

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
        message: 'Restored previous session.',
      };
    }
    return null;
  });
  const [exportStatus, setExportStatus] = useState(null);
  const [hasRestoredSettings, setHasRestoredSettings] = useState(false);
  const mediaOperationsRef = useRef({});
  const exportPreviewSuspendRef = useRef(false);

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
    clearFile: clearAudioFile,
    togglePlay,
    seek,
    beginScrub,
    endScrub,
  } = useNarrationAudio();

  const {
    introVideoRef,
    fileName: introFileName,
    duration: introDuration,
    isReady: isIntroReady,
    loadFile: loadIntroFile,
    removeFile: removeIntroFile,
  } = useIntroVideo();

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
    imageFileName,
    videoFileName,
    isImageReady,
    isVideoReady,
    loadImageFile,
    loadVideoFile,
    clearImageFile,
    clearVideoFile,
    seekVideoToAudioTime,
  } = useBackgroundStyle(isPlaying);

  const {
    captions,
    generate,
    distributeEvenly,
    updateDuration,
    resetDuration,
    clearCaptions,
    deleteCaption,
    moveCaption,
    tapState,
    startTapMode,
    recordTap,
    cancelTapMode,
  } = useCaptions(
    Array.isArray(initialSaved?.captions) ? initialSaved.captions : [],
  );

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
    suspendRef: exportPreviewSuspendRef,
  });

  const handleExportStatus = useCallback((tone, message) => {
    setExportStatus({ tone, message });
  }, []);

  const {
    isExporting,
    downloadUrl,
    downloadExtension,
    progress: exportProgress,
    startExport,
    supportedFormats,
    selectedExportFormat,
    setSelectedExportFormat,
  } = useExportRecorder({
    audioRef,
    introVideoRef,
    hasIntro: isIntroReady,
    videoElRef,
    bgType,
    canvasRef,
    resolution,
    redrawAnnouncement: redrawNow,
    onStatus: handleExportStatus,
    suspendPreviewRef: exportPreviewSuspendRef,
    initialExportFormat: initialSaved?.exportFormat,
  });

  const queueMediaOperation = (key, operation) => {
    const previous = mediaOperationsRef.current[key] ?? Promise.resolve();
    const next = previous.catch(() => {}).then(operation);
    mediaOperationsRef.current[key] = next;
    return next;
  };

  const handleSaveMedia = (key, file, onLoad) => {
    onLoad(file);
    queueMediaOperation(key, () => saveMedia(key, file)).catch((error) => {
      setGenStatus({
        tone: 'warn',
        message: `Could not cache ${file.name}: ${error.message}`,
      });
    });
  };

  const handleClearMedia = (key, onClear) => {
    onClear();
    queueMediaOperation(key, () => clearMedia(key)).catch((error) => {
      setGenStatus({
        tone: 'warn',
        message: `Could not clear cached media: ${error.message}`,
      });
    });
  };

  const handleClearSession = () => {
    clearState();
    const mediaKeys = [
      'audio',
      'intro',
      'background-image',
      'background-video',
    ];
    Promise.all(
      mediaKeys.map((key) =>
        queueMediaOperation(key, () => clearMedia(key)),
      ),
    ).catch((error) => {
      setGenStatus({
        tone: 'warn',
        message: `Session was reset, but cached media could not be cleared: ${error.message}`,
      });
    });
    clearAudioFile();
    removeIntroFile();
    clearImageFile();
    clearVideoFile();
    clearCaptions();
    cancelTapMode();
    setScriptText('');
    setBgType('color');
    setBgColor(DEFAULT_BG_COLOR);
    setTextColor(DEFAULT_TEXT_COLOR);
    setFontSize(DEFAULT_FONT_SIZE);
    setFontFamily(DEFAULT_FONT_FAMILY);
    setTextPosition(DEFAULT_TEXT_POSITION);
    setResolution(DEFAULT_RESOLUTION);
    setSpeakingPace(DEFAULT_PACE);
    setSelectedExportFormat(supportedFormats[0]?.id ?? '');
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
    if (initialSaved) {
      if (initialSaved.bgType) setBgType(initialSaved.bgType);
      if (initialSaved.bgColor) setBgColor(initialSaved.bgColor);
      if (initialSaved.textColor) setTextColor(initialSaved.textColor);
      if (initialSaved.fontSize) setFontSize(initialSaved.fontSize);
      if (initialSaved.fontFamily) setFontFamily(initialSaved.fontFamily);
      if (initialSaved.textPosition) setTextPosition(initialSaved.textPosition);
      if (initialSaved.resolution) setResolution(initialSaved.resolution);
      if (initialSaved.speakingPace) setSpeakingPace(initialSaved.speakingPace);
    }
    setHasRestoredSettings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- restore uploaded media from IndexedDB ---
  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      loadMedia('audio'),
      loadMedia('intro'),
      loadMedia('background-image'),
      loadMedia('background-video'),
    ])
      .then(([audio, intro, backgroundImage, backgroundVideo]) => {
        if (!isCurrent) return;
        if (audio) loadFile(audio);
        if (intro) loadIntroFile(intro);
        if (backgroundImage) loadImageFile(backgroundImage);
        if (backgroundVideo) loadVideoFile(backgroundVideo);
        if (!audio && initialSaved?.audioFileName) {
          setGenStatus({
            tone: 'warn',
            message: `Audio "${initialSaved.audioFileName}" could not be restored. Please select it again.`,
          });
        }
      })
      .catch((error) => {
        if (!isCurrent) return;
        setGenStatus({
          tone: 'warn',
          message: `Could not restore cached files: ${error.message}`,
        });
      });
    return () => {
      isCurrent = false;
    };
  }, [loadFile, loadIntroFile, loadImageFile, loadVideoFile]);

  // --- sync refs for keyboard handler ---
  useEffect(() => {
    handleRecordTapRef.current = handleRecordTap;
    togglePlayRef.current = togglePlay;
    tapActiveRef.current = tapState?.active ?? false;
  });

  // --- localStorage save on changes ---
  useEffect(() => {
    if (!hasRestoredSettings) return;
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
      exportFormat: selectedExportFormat,
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
    selectedExportFormat,
    fileName,
    audioDuration,
    hasRestoredSettings,
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
            onFileSelected={(file) => handleSaveMedia('audio', file, loadFile)}
            onClear={() => handleClearMedia('audio', clearAudioFile)}
          />
          <IntroVideoStep
            fileName={introFileName}
            duration={introDuration}
            onFileSelected={(file) => handleSaveMedia('intro', file, loadIntroFile)}
            onRemove={() => handleClearMedia('intro', removeIntroFile)}
          />
          <CaptionsStep
            captions={captions}
            status={genStatus}
            canGenerate={audioDuration > 0}
            onGenerate={handleGenerate}
            onDistributeEvenly={handleDistributeEvenly}
            onDurationChange={handleDurationChange}
            onResetDuration={resetDuration}
            onClearCaptions={clearCaptions}
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
            imageFileName={imageFileName}
            videoFileName={videoFileName}
            onImageFile={(file) =>
              handleSaveMedia('background-image', file, loadImageFile)
            }
            onVideoFile={(file) =>
              handleSaveMedia('background-video', file, loadVideoFile)
            }
            onClearImage={() =>
              handleClearMedia('background-image', clearImageFile)
            }
            onClearVideo={() =>
              handleClearMedia('background-video', clearVideoFile)
            }
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
          downloadExtension={downloadExtension}
          exportStatus={exportStatus}
          resolution={resolution}
          exportFormats={supportedFormats}
          selectedExportFormat={selectedExportFormat}
          onExportFormatChange={setSelectedExportFormat}
        />
      </div>

      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" hidden />
      <video ref={introVideoRef} preload="metadata" playsInline hidden />
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
