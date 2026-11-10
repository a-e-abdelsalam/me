// ==========================================================================
// CINEMATIC VIDEO PLAYER ENGINE & HOVER PREVIEW MANAGER
// High-Performance, Keyboard Controlled, Custom Scrubbing & Cinema Modal
// ==========================================================================

const PlayerEngine = (function() {
  let activePreviewVideo = null;
  let activeModalProject = null;
  let activePlaylist = [];
  let currentPlaylistIndex = 0;

  // DOM Elements for Cinema Modal
  let modalEl = null;
  let videoEl = null;
  let driveFrame = null;
  let playerStage = null;
  let playBtn = null;
  let scrubBar = null;
  let scrubProgress = null;
  let scrubBuffer = null;
  let timecodeEl = null;
  let muteBtn = null;
  let volumeSlider = null;
  let speedBtn = null;
  let fullscreenBtn = null;
  let nextBtn = null;
  let prevBtn = null;
  let closeBtn = null;

  // Sidebar Elements
  let sidebarTitle = null;
  let sidebarClient = null;
  let sidebarDesc = null;
  let sidebarBadgeCategory = null;
  let sidebarBadgeAspect = null;
  let sidebarMetaCategory = null;
  let sidebarMetaAspect = null;
  let sidebarMetaDuration = null;
  let sidebarMetaSize = null;
  let sidebarHireBtn = null;

  const PLAYBACK_SPEEDS = [0.75, 1.0, 1.25, 1.5, 2.0];
  let currentSpeedIndex = 1;
  let driveMode = false; // true while streaming a Google Drive embed

  // ========================================================================
  // GOOGLE DRIVE SOURCE RESOLUTION
  // A project can either have a local file or be linked to Google Drive:
  // { file: 'assets/x.mp4' }                       → HTML5 <video> playback
  // { drive_id / embed_url }                       → Google embed iframe
  // ========================================================================
  function hasDrive(project) {
    return !!(project && (project.embed_url || project.drive_id));
  }

  function resolveEmbedUrl(project) {
    if (!project) return '';
    if (project.embed_url) return project.embed_url;
    return project.drive_id
      ? `https://drive.google.com/file/d/${project.drive_id}/preview`
      : '';
  }

  function init() {
    cacheDom();
    bindModalEvents();
    bindKeyboardShortcuts();
  }

  function cacheDom() {
    modalEl = document.getElementById('cinemaModal');
    videoEl = document.getElementById('modalVideo');
    driveFrame = document.getElementById('modalDriveFrame');
    playerStage = document.getElementById('playerStage');
    playBtn = document.getElementById('modalPlayBtn');
    scrubBar = document.getElementById('modalScrubBar');
    scrubProgress = document.getElementById('modalScrubProgress');
    scrubBuffer = document.getElementById('modalScrubBuffer');
    timecodeEl = document.getElementById('modalTimecode');
    muteBtn = document.getElementById('modalMuteBtn');
    volumeSlider = document.getElementById('modalVolumeSlider');
    speedBtn = document.getElementById('modalSpeedBtn');
    fullscreenBtn = document.getElementById('modalFullscreenBtn');
    nextBtn = document.getElementById('modalNextBtn');
    prevBtn = document.getElementById('modalPrevBtn');
    closeBtn = document.getElementById('modalCloseBtn');

    sidebarTitle = document.getElementById('modalSidebarTitle');
    sidebarClient = document.getElementById('modalSidebarClient');
    sidebarDesc = document.getElementById('modalSidebarDesc');
    sidebarBadgeCategory = document.getElementById('modalBadgeCategory');
    sidebarBadgeAspect = document.getElementById('modalBadgeAspect');
    sidebarMetaCategory = document.getElementById('modalMetaCategory');
    sidebarMetaAspect = document.getElementById('modalMetaAspect');
    sidebarMetaDuration = document.getElementById('modalMetaDuration');
    sidebarMetaSize = document.getElementById('modalMetaSize');
    sidebarHireBtn = document.getElementById('modalHireBtn');
  }

  // ========================================================================
  // HOVER PREVIEW MANAGEMENT (Desktop & Touch)
  // ========================================================================
  function attachCardHoverListeners(cardEl, videoElement, project) {
    const progressFill = cardEl.querySelector('.card-progress-fill');

    // Auto-detect aspect ratio once metadata is available
    videoElement.addEventListener('loadedmetadata', function() {
      if (videoElement.videoHeight > videoElement.videoWidth) {
        cardEl.classList.remove('ratio-horizontal');
        cardEl.classList.add('ratio-vertical');
        project.aspect = '9:16';
      } else {
        cardEl.classList.remove('ratio-vertical');
        cardEl.classList.add('ratio-horizontal');
        project.aspect = '16:9';
      }
      const aspectPill = cardEl.querySelector('.badge-aspect');
      if (aspectPill) aspectPill.textContent = project.aspect;
    });

    // Update mini-progress on card hover
    videoElement.addEventListener('timeupdate', function() {
      if (progressFill && videoElement.duration) {
        const pct = (videoElement.currentTime / videoElement.duration) * 100;
        progressFill.style.width = `${pct}%`;
      }
    });

    // Desktop hover enter
    cardEl.addEventListener('mouseenter', function() {
      startPreview(videoElement);
    });

    // Desktop hover leave
    cardEl.addEventListener('mouseleave', function() {
      stopPreview(videoElement, progressFill);
    });

    // Card click -> Open Cinema Modal
    cardEl.addEventListener('click', function(e) {
      // Don't trigger if user clicked an external tag or action
      if (e.target.closest('.no-modal-trigger')) return;
      openCinema(project);
    });
  }

  function startPreview(vid) {
    if (activePreviewVideo && activePreviewVideo !== vid) {
      try {
        activePreviewVideo.pause();
        activePreviewVideo.currentTime = 0.2;
      } catch(e) {}
    }
    activePreviewVideo = vid;
    vid.muted = true;
    vid.loop = true;
    
    // Jump slightly forward to skip blank initial frames
    if (vid.currentTime < 0.2) {
      vid.currentTime = 0.3;
    }
    const playPromise = vid.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay may be restricted before interaction, ignore gracefully
      });
    }
  }

  function stopPreview(vid, progressFill) {
    try {
      vid.pause();
      vid.currentTime = 0.2;
    } catch(e) {}
    if (progressFill) {
      progressFill.style.width = '0%';
    }
    if (activePreviewVideo === vid) {
      activePreviewVideo = null;
    }
  }

  // ========================================================================
  // CINEMA LIGHTBOX / MODAL PLAYER
  // ========================================================================
  function openCinema(project, playlist = null) {
    // Stop any running card preview
    if (activePreviewVideo) {
      try {
        activePreviewVideo.pause();
      } catch(e) {}
      activePreviewVideo = null;
    }

    if (playlist && playlist.length > 0) {
      activePlaylist = playlist;
      currentPlaylistIndex = activePlaylist.findIndex(p => p.id === project.id);
      if (currentPlaylistIndex === -1) currentPlaylistIndex = 0;
    } else {
      // Keep the gallery playlist so next/prev traverse the filtered set
      const idx = activePlaylist.findIndex(p => p.id === project.id);
      if (idx >= 0) {
        currentPlaylistIndex = idx;
      } else {
        activePlaylist = [project];
        currentPlaylistIndex = 0;
      }
    }

    activeModalProject = project;
    loadProjectIntoModal(project);
    modalEl.classList.add('active');
    document.body.style.overflow = 'hidden';

    resumePlayback();
  }

  // Start playback using whatever source the projector resolved to
  function resumePlayback() {
    if (driveMode) {
      updatePlayBtnState(true); // Drive iframe autoplays; we just balance the UI
      return;
    }
    try { videoEl.currentTime = 0; } catch (e) {}
    videoEl.play().then(() => {
      updatePlayBtnState(true);
    }).catch(() => {
      updatePlayBtnState(false);
    });
  }

  function closeCinema() {
    if (!modalEl.classList.contains('active')) return;
    try {
      videoEl.pause();
    } catch(e) {}
    // Unload the Drive iframe — a hidden iframe keeps streaming audio
    if (driveFrame) driveFrame.src = '';
    driveMode = false;
    if (playerStage) playerStage.classList.remove('drive-mode');
    modalEl.classList.remove('active');
    document.body.style.overflow = '';
    activeModalProject = null;
  }

  function loadProjectIntoModal(project) {
    const isAr = (document.documentElement.getAttribute('lang') || 'ar') === 'ar';
    const embedUrl = resolveEmbedUrl(project);

    // ---- Decide the source:
    // Hosted: the Drive embed wins — the video never touches the host.
    // Local (file://): the bundled file wins for instant full-quality playback.
    const isHosted = location.protocol.startsWith('http');
    const useDrive = !!embedUrl && (isHosted || !project.file);

    driveMode = useDrive && !!driveFrame;
    if (driveMode && playerStage) playerStage.classList.add('drive-mode');
    if (!driveMode && playerStage) playerStage.classList.remove('drive-mode');

    if (driveMode) {
      driveFrame.src = embedUrl;
      try { videoEl.pause(); videoEl.removeAttribute('src'); videoEl.load(); } catch (e) {}
      // Custom HTML5 controls don't apply to Drive streams
      sidebarMetaDuration.textContent = '—';
      const note = document.getElementById('driveSourceNote');
      if (note) note.textContent = isAr
        ? '☁️ بث مباشر من Google Drive — استخدم أدوات مشغّل جوجل بالمرور على الشاشة'
        : '☁️ Streaming directly from Google Drive — hover the screen for Google\'s controls';
    } else {
      if (driveFrame) driveFrame.src = '';
      if (project.file) {
        videoEl.src = encodeURI(project.file);
      } else {
        videoEl.removeAttribute('src');
        videoEl.load();
      }
      videoEl.playbackRate = PLAYBACK_SPEEDS[currentSpeedIndex];
    }

    // Populate Sidebar Details
    sidebarTitle.textContent = isAr ? project.title_ar : project.title_en;
    sidebarClient.textContent = project.client;
    sidebarDesc.textContent = isAr ? project.desc_ar : project.desc_en;

    sidebarBadgeCategory.textContent = project.category.toUpperCase();
    sidebarBadgeCategory.className = `badge-tag ${project.category}`;
    sidebarBadgeAspect.textContent = project.aspect || '9:16';

    sidebarMetaCategory.textContent = project.category.toUpperCase();
    sidebarMetaAspect.textContent = project.aspect || '9:16';
    sidebarMetaSize.textContent = (project.drive_id || project.embed_url)
      ? '☁️ Google Drive'
      : (project.sizeMB ? `${project.sizeMB} MB` : '—');

    // WhatsApp Hire button with pre-filled video details
    const targetPhone = "201113320114"; // Updated user WhatsApp
    const videoTitle = isAr ? project.title_ar : project.title_en;
    const msgText = isAr 
      ? `مرحباً أستاذ أحمد، أود الاستفسار عن تفاصيل ومونتاج فيديو مشابه لمشروع: "${videoTitle}" (${project.client}).`
      : `Hello Ahmed, I would like to inquire about video editing services similar to project: "${videoTitle}" (${project.client}).`;
    
    sidebarHireBtn.href = `https://wa.me/${targetPhone}?text=${encodeURIComponent(msgText)}`;
  }

  function playNext() {
    if (!activePlaylist.length) return;
    currentPlaylistIndex = (currentPlaylistIndex + 1) % activePlaylist.length;
    activeModalProject = activePlaylist[currentPlaylistIndex];
    loadProjectIntoModal(activeModalProject);
    resumePlayback();
  }

  function playPrev() {
    if (!activePlaylist.length) return;
    currentPlaylistIndex = (currentPlaylistIndex - 1 + activePlaylist.length) % activePlaylist.length;
    activeModalProject = activePlaylist[currentPlaylistIndex];
    loadProjectIntoModal(activeModalProject);
    resumePlayback();
  }

  function togglePlay() {
    if (driveMode) return; // Google's iframe manages its own playback
    if (videoEl.paused || videoEl.ended) {
      videoEl.play();
      updatePlayBtnState(true);
    } else {
      videoEl.pause();
      updatePlayBtnState(false);
    }
  }

  function updatePlayBtnState(isPlaying) {
    if (!playBtn) return;
    if (isPlaying) {
      playBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      `;
    } else {
      playBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
    }
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function bindModalEvents() {
    if (!modalEl) return;

    // Play / Pause Click
    playBtn.addEventListener('click', togglePlay);
    videoEl.addEventListener('click', togglePlay);

    // Close Click
    closeBtn.addEventListener('click', closeCinema);
    modalEl.addEventListener('click', function(e) {
      if (e.target === modalEl) closeCinema();
    });

    // Next / Prev Buttons
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);

    // Video Time Update & Scrubber Progress
    videoEl.addEventListener('timeupdate', function() {
      if (!videoEl.duration) return;
      const progressPct = (videoEl.currentTime / videoEl.duration) * 100;
      scrubProgress.style.width = `${progressPct}%`;
      timecodeEl.textContent = `${formatTime(videoEl.currentTime)} / ${formatTime(videoEl.duration)}`;

      // Update buffer bar
      if (videoEl.buffered.length > 0) {
        const bufferedEnd = videoEl.buffered.end(videoEl.buffered.length - 1);
        const bufferPct = (bufferedEnd / videoEl.duration) * 100;
        scrubBuffer.style.width = `${bufferPct}%`;
      }
    });

    videoEl.addEventListener('loadedmetadata', function() {
      timecodeEl.textContent = `00:00 / ${formatTime(videoEl.duration)}`;
      if (sidebarMetaDuration) {
        sidebarMetaDuration.textContent = formatTime(videoEl.duration);
      }
    });

    videoEl.addEventListener('ended', function() {
      // Auto play next video for continuous viewing experience!
      playNext();
    });

    // Scrub Bar Click / Drag
    let isScrubbing = false;
    function handleScrub(e) {
      const rect = scrubBar.getBoundingClientRect();
      const clickPos = (e.clientX - rect.left) / rect.width;
      const boundedPos = Math.max(0, Math.min(1, clickPos));
      scrubProgress.style.width = `${boundedPos * 100}%`;
      videoEl.currentTime = boundedPos * videoEl.duration;
    }

    scrubBar.addEventListener('mousedown', function(e) {
      isScrubbing = true;
      handleScrub(e);
    });
    window.addEventListener('mousemove', function(e) {
      if (isScrubbing) handleScrub(e);
    });
    window.addEventListener('mouseup', function() {
      if (isScrubbing) isScrubbing = false;
    });

    // Volume & Mute
    muteBtn.addEventListener('click', function() {
      videoEl.muted = !videoEl.muted;
      updateVolumeIcon();
    });

    volumeSlider.addEventListener('input', function() {
      videoEl.volume = parseFloat(volumeSlider.value);
      videoEl.muted = (videoEl.volume === 0);
      updateVolumeIcon();
    });

    function updateVolumeIcon() {
      if (videoEl.muted || videoEl.volume === 0) {
        muteBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          </svg>
        `;
      } else {
        muteBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        `;
      }
    }

    // Speed Selector
    speedBtn.addEventListener('click', function() {
      currentSpeedIndex = (currentSpeedIndex + 1) % PLAYBACK_SPEEDS.length;
      const speed = PLAYBACK_SPEEDS[currentSpeedIndex];
      videoEl.playbackRate = speed;
      speedBtn.textContent = `${speed}x`;
    });

    // Fullscreen Toggle
    fullscreenBtn.addEventListener('click', function() {
      if (!document.fullscreenElement) {
        const stage = document.querySelector('.player-stage');
        if (stage.requestFullscreen) {
          stage.requestFullscreen();
        } else if (videoEl.requestFullscreen) {
          videoEl.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });
  }

  // Keyboard Shortcuts
  function bindKeyboardShortcuts() {
    window.addEventListener('keydown', function(e) {
      if (!modalEl.classList.contains('active')) return;

      // Don't intercept when user is typing in search input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      // Drive streams live inside Google's own iframe: only navigation
      // shortcuts (close / next / prev) stay under our control
      if (driveMode) {
        if (e.code === 'Escape') {
          e.preventDefault();
          closeCinema();
        } else if (e.code === 'ArrowLeft' && e.shiftKey) {
          e.preventDefault();
          playPrev();
        } else if (e.code === 'ArrowRight' && e.shiftKey) {
          e.preventDefault();
          playNext();
        }
        return;
      }

      switch(e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'Escape':
          e.preventDefault();
          closeCinema();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            playPrev();
          } else {
            videoEl.currentTime = Math.max(0, videoEl.currentTime - 5);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            playNext();
          } else {
            videoEl.currentTime = Math.min(videoEl.duration, videoEl.currentTime + 5);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          videoEl.volume = Math.min(1, videoEl.volume + 0.1);
          volumeSlider.value = videoEl.volume;
          break;
        case 'ArrowDown':
          e.preventDefault();
          videoEl.volume = Math.max(0, videoEl.volume - 0.1);
          volumeSlider.value = videoEl.volume;
          break;
        case 'KeyM':
          e.preventDefault();
          videoEl.muted = !videoEl.muted;
          break;
        case 'KeyF':
          e.preventDefault();
          fullscreenBtn.click();
          break;
      }
    });
  }

  return {
    init,
    openCinema,
    closeCinema,
    attachCardHoverListeners,
    updateActivePlaylist: (list) => { activePlaylist = list; }
  };
})();
