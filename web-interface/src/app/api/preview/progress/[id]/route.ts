import { NextRequest, NextResponse } from 'next/server';
import { getProcess } from '@/lib/previewStore';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const processingId = params.id;

  // Set up SSE headers
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', processingId })}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Set up interval to send progress updates
      const interval = setInterval(() => {
        const processInfo = getProcess(processingId);
        
        if (!processInfo) {
          // Process not found or completed
          const data = `data: ${JSON.stringify({ 
            type: 'error', 
            message: 'Process not found' 
          })}\n\n`;
          controller.enqueue(encoder.encode(data));
          clearInterval(interval);
          controller.close();
          return;
        }

        const { progress } = processInfo;

        if (progress.status === 'complete') {
          const data = `data: ${JSON.stringify({ 
            type: 'complete', 
            previewUrl: progress.previewUrl 
          })}\n\n`;
          controller.enqueue(encoder.encode(data));
          clearInterval(interval);
          controller.close();
        } else if (progress.status === 'error') {
          const data = `data: ${JSON.stringify({ 
            type: 'error', 
            message: progress.message 
          })}\n\n`;
          controller.enqueue(encoder.encode(data));
          clearInterval(interval);
          controller.close();
        } else {
          const data = `data: ${JSON.stringify({ 
            type: 'progress', 
            step: progress.step,
            progress: progress.progress 
          })}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      }, 500); // Update every 500ms

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
