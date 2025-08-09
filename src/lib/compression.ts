import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file using browser-image-compression library
 */
export async function compressImage(
  file: File,
  maxSizeBytes: number = 1024 * 1024, // 1MB default
  onProgress?: (progress: number) => void
): Promise<File> {
  onProgress?.(10);

  const options = {
    maxSizeMB: maxSizeBytes / (1024 * 1024), // Convert bytes to MB
    maxWidthOrHeight: 1920, // Max dimension
    useWebWorker: true,
    fileType: 'image/jpeg', // Default to JPEG for better compatibility
    initialQuality: 0.8,
    onProgress: (progress: number) => {
      onProgress?.(10 + (progress * 0.8)); // Map 0-100 to 10-90
    },
  };

  try {
    // Try with original format first if it's a supported format
    if (file.type === 'image/webp' || file.type === 'image/png' || file.type === 'image/jpeg') {
      const formatOptions = { ...options, fileType: file.type as any };
      const compressed = await imageCompression(file, formatOptions);
      
      if (compressed.size <= maxSizeBytes) {
        onProgress?.(100);
        return compressed;
      }
    }

    // If original format didn't work or file is too large, try JPEG
    const jpegOptions = { ...options, fileType: 'image/jpeg' as const };
    const compressed = await imageCompression(file, jpegOptions);
    
    if (compressed.size <= maxSizeBytes) {
      onProgress?.(100);
      return compressed;
    }

    // If still too large, try with lower quality
    const lowQualityOptions = {
      ...jpegOptions,
      initialQuality: 0.6,
      maxWidthOrHeight: 1280,
    };
    
    const lowQualityCompressed = await imageCompression(file, lowQualityOptions);
    
    if (lowQualityCompressed.size <= maxSizeBytes) {
      onProgress?.(100);
      return lowQualityCompressed;
    }

    // Final attempt with very aggressive compression
    const aggressiveOptions = {
      ...jpegOptions,
      initialQuality: 0.4,
      maxWidthOrHeight: 800,
    };
    
    const aggressiveCompressed = await imageCompression(file, aggressiveOptions);
    onProgress?.(100);
    return aggressiveCompressed;

  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Image compression failed');
  }
}

/**
 * Compresses a video file using canvas-based transcoding
 */
export async function compressVideo(
  file: File,
  maxSizeBytes: number = 1024 * 1024, // 1MB default
  onProgress?: (progress: number) => void
): Promise<File> {
  onProgress?.(5);

  // If video is already small enough, return as-is
  if (file.size <= maxSizeBytes) {
    onProgress?.(100);
    return file;
  }

  try {
    return await transcodeVideo(file, maxSizeBytes, onProgress);
  } catch (error) {
    console.error('Video transcoding failed:', error);
    // Fall back to frame extraction
    return await extractVideoFrame(file, maxSizeBytes, onProgress);
  }
}

/**
 * Transcodes video using canvas and MediaRecorder API
 */
async function transcodeVideo(
  file: File,
  maxSizeBytes: number,
  onProgress?: (progress: number) => void
): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    // Quality settings to try in order (resolution, bitrate)
    const qualitySettings = [
      { maxDimension: 720, videoBitsPerSecond: 1000000 },  // 720p, 1Mbps
      { maxDimension: 480, videoBitsPerSecond: 500000 },   // 480p, 500kbps
      { maxDimension: 360, videoBitsPerSecond: 250000 },   // 360p, 250kbps
      { maxDimension: 240, videoBitsPerSecond: 125000 },   // 240p, 125kbps
    ];

    let currentQualityIndex = 0;

    const tryTranscode = () => {
      if (currentQualityIndex >= qualitySettings.length) {
        // All quality attempts failed, fall back to frame extraction
        extractVideoFrame(file, maxSizeBytes, onProgress)
          .then(resolve)
          .catch(reject);
        return;
      }

      const { maxDimension, videoBitsPerSecond } = qualitySettings[currentQualityIndex];
      
      video.onloadedmetadata = () => {
        onProgress?.(20 + (currentQualityIndex * 15));

        const { videoWidth, videoHeight } = video;
        
        // Calculate scaled dimensions
        let width = videoWidth;
        let height = videoHeight;

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // Create MediaRecorder stream
        const stream = canvas.captureStream(15); // 15 FPS
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8',
          videoBitsPerSecond
        });

        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          
          if (blob.size <= maxSizeBytes) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webm'), {
              type: 'video/webm',
              lastModified: Date.now(),
            });
            onProgress?.(100);
            resolve(compressedFile);
          } else {
            // Try next quality setting
            currentQualityIndex++;
            tryTranscode();
          }
        };

        mediaRecorder.onerror = () => {
          currentQualityIndex++;
          tryTranscode();
        };

        // Start recording
        mediaRecorder.start(100); // Collect data every 100ms

        let frameCount = 0;
        const totalFrames = Math.ceil(video.duration * 15); // Estimate frames at 15fps

        const renderFrame = () => {
          if (video.ended || video.paused) {
            mediaRecorder.stop();
            return;
          }

          ctx.drawImage(video, 0, 0, width, height);
          frameCount++;

          // Update progress
          const progressPercent = Math.min(90, 30 + (frameCount / totalFrames) * 50);
          onProgress?.(progressPercent);

          requestAnimationFrame(renderFrame);
        };

        video.onended = () => {
          mediaRecorder.stop();
        };

        // Start playback and rendering
        video.currentTime = 0;
        video.play().then(() => {
          renderFrame();
        }).catch(() => {
          currentQualityIndex++;
          tryTranscode();
        });
      };

      video.onerror = () => {
        currentQualityIndex++;
        tryTranscode();
      };

      video.src = URL.createObjectURL(file);
      video.load();
      video.muted = true; // Ensure autoplay works
    };

    // Check MediaRecorder support
    if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      // Fallback to frame extraction if WebM not supported
      extractVideoFrame(file, maxSizeBytes, onProgress)
        .then(resolve)
        .catch(reject);
      return;
    }

    tryTranscode();
  });
}

/**
 * Fallback: Extract a frame from video and compress it as an image
 */
async function extractVideoFrame(
  file: File, 
  maxSizeBytes: number, 
  onProgress?: (progress: number) => void
): Promise<File> {
  onProgress?.(50);

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    video.onloadedmetadata = () => {
      onProgress?.(70);

      const { videoWidth, videoHeight } = video;
      
      // Scale to reasonable size
      const maxDimension = 720;
      let width = videoWidth;
      let height = videoHeight;

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      video.currentTime = video.duration / 2; // Middle frame
    };

    video.onseeked = () => {
      onProgress?.(80);
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error('Frame extraction failed'));
            return;
          }

          const frameFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          try {
            // Compress the extracted frame
            const compressed = await compressImage(frameFile, maxSizeBytes, (progress) => {
              onProgress?.(80 + (progress * 0.2)); // Map to 80-100%
            });
            resolve(compressed);
          } catch (error) {
            reject(error);
          }
        },
        'image/jpeg',
        0.8
      );
    };

    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(file);
    video.load();
  });
}

/**
 * Compresses a file based on its type
 */
export async function compressFile(
  file: File,
  maxSizeBytes: number = 1024 * 1024,
  onProgress?: (progress: number) => void
): Promise<File> {
  if (file.size <= maxSizeBytes) {
    onProgress?.(100);
    return file;
  }

  if (file.type.startsWith('image/')) {
    return compressImage(file, maxSizeBytes, onProgress);
  }

  if (file.type.startsWith('video/')) {
    return compressVideo(file, maxSizeBytes, onProgress);
  }

  // For unsupported file types, return as-is
  onProgress?.(100);
  return file;
}

/**
 * Gets the estimated compression ratio for a file type
 */
export function getEstimatedCompressionRatio(fileType: string): number {
  if (fileType.startsWith('image/')) {
    // browser-image-compression is very efficient
    if (fileType === 'image/png') return 0.2; // PNG compresses very well to JPEG
    if (fileType === 'image/gif') return 0.3; // GIF to JPEG compression
    if (fileType === 'image/webp') return 0.4; // Already compressed format
    return 0.25; // JPEG recompression
  }
  if (fileType.startsWith('video/')) {
    // Canvas-based transcoding to WebM can achieve good compression
    return 0.3; // Videos can be compressed with WebM codec
  }
  return 1; // No compression for other types
}

/**
 * Check if video compression is available
 */
export function isVideoCompressionAvailable(): boolean {
  return typeof MediaRecorder !== 'undefined' && 
         MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
}