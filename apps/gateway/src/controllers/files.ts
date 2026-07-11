import { FastifyInstance } from 'fastify';
import { prisma } from '@ai-gateway/database';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { pipeline } from 'stream';

const pump = util.promisify(pipeline);
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export default async function fileRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', (fastify as any).authenticate);

  fastify.post('/v1/files/upload', async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: 'No file uploaded' });

    const userId = (request as any).user.id;
    const filename = `${Date.now()}-${data.filename}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Save to local disk
    await pump(data.file, fs.createWriteStream(filePath));

    // Calculate size
    const stat = fs.statSync(filePath);
    const sizeBytes = stat.size;

    // Create FileAsset in DB
    const fileAsset = await prisma.fileAsset.create({
      data: {
        filename: data.filename,
        mimeType: data.mimetype,
        sizeBytes,
        storageKey: filename,
        storageType: 'LOCAL'
      }
    });

    // If text-based or PDF, extract text to return
    let extractedText = null;
    if (data.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text;
    } else if (data.mimetype.startsWith('text/') || data.mimetype === 'text/csv') {
      extractedText = fs.readFileSync(filePath, 'utf-8');
    }

    return { 
      success: true, 
      file: {
        id: fileAsset.id,
        filename: fileAsset.filename,
        size: fileAsset.sizeBytes
      },
      extractedText
    };
  });
}
