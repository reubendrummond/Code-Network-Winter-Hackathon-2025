import imageCompression from 'browser-image-compression';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// FFmpeg instance (lazy loaded)
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;

/**
 * Initialize FFmpeg instance
 */
async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegLoaded) {
    return ffmpegInstance;
  }

  ffmpegInstance = new FFmpeg();
  
  // Load FFmpeg core
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  ffmpegInstance.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });

  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegLoaded = true;
  return ffmpegInstance;
}

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
 * Compresses a video file using FFmpeg.wasm
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
    onProgress?.(10);
    
    // Initialize FFmpeg
    const ffmpeg = await initFFmpeg();
    onProgress?.(20);

    // Write input file
    const inputFileName = `input.${file.name.split('.').pop() || 'mp4'}`;
    const outputFileName = 'output.mp4';
    
    await ffmpeg.writeFile(inputFileName, await fetchFile(file));
    onProgress?.(30);

    // Set up progress tracking
    ffmpeg.on('progress', ({ progress }) => {
      onProgress?.(30 + (progress * 0.6)); // Map FFmpeg progress to 30-90%
    });

    // Compress video with progressive quality reduction
    
    // Compress video with multiple quality attempts
    const compressionAttempts = [
      // High quality attempt
      ['-i', inputFileName, '-c:v', 'libx264', '-preset', 'medium', '-crf', '28', '-vf', 'scale=-2:720', '-c:a', 'aac', '-b:a', '96k', outputFileName],
      // Medium quality attempt  
      ['-i', inputFileName, '-c:v', 'libx264', '-preset', 'fast', '-crf', '32', '-vf', 'scale=-2:480', '-c:a', 'aac', '-b:a', '64k', outputFileName],
      // Low quality attempt
      ['-i', inputFileName, '-c:v', 'libx264', '-preset', 'fast', '-crf', '36', '-vf', 'scale=-2:360', '-c:a', 'aac', '-b:a', '32k', outputFileName],
    ];

    let compressedFile: File | null = null;

    for (const args of compressionAttempts) {
      try {
        await ffmpeg.exec(args);
        
        const data = await ffmpeg.readFile(outputFileName);
        const blob = new Blob([data as BlobPart], { type: 'video/mp4' });
        
        if (blob.size <= maxSizeBytes) {
          compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.mp4'), {
            type: 'video/mp4',
            lastModified: Date.now(),
          });
          break;
        }
        
        // Clean up for next attempt
        try {
          await ffmpeg.deleteFile(outputFileName);
        } catch (e) {
          // Ignore cleanup errors
        }
      } catch (error) {
        console.warn('FFmpeg compression attempt failed:', error);
        continue;
      }
    }

    // Clean up
    try {
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);
    } catch (e) {
      // Ignore cleanup errors
    }

    if (compressedFile) {
      onProgress?.(100);
      return compressedFile;
    }

    // If video compression failed, fall back to extracting a frame as image
    console.warn('Video compression failed, extracting frame as image');
    return await extractVideoFrame(file, maxSizeBytes, onProgress);

  } catch (error) {
    console.error('Video compression failed:', error);
    // Fall back to frame extraction
    return await extractVideoFrame(file, maxSizeBytes, onProgress);
  }
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
 * Gets the estimated compression ratio for a file type with professional libraries
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
    // FFmpeg.wasm can achieve much better compression
    return 0.15; // Videos can be compressed significantly with proper codecs
  }
  return 1; // No compression for other types
}

/**
 * Check if FFmpeg is available and loaded
 */
export function isFFmpegAvailable(): boolean {
  return ffmpegLoaded && ffmpegInstance !== null;
}

/**
 * Preload FFmpeg for faster video compression
 */
export async function preloadFFmpeg(): Promise<void> {
  try {
    await initFFmpeg();
    console.log('[Compression] FFmpeg preloaded successfully');
  } catch (error) {
    console.warn('[Compression] Failed to preload FFmpeg:', error);
  }
}