import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { getDocument, listSteps } from './documents'

export async function exportDocumentPdf(documentId: number, outPath?: string): Promise<string> {
  const doc = getDocument(documentId)
  const steps = listSteps(documentId)
  const targetPath =
    outPath ?? path.join(app.getPath('downloads'), `${doc.number.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`)

  return new Promise((resolve, reject) => {
    try {
      const pdf = new PDFDocument({ size: 'A4', margin: 50, info: { Title: doc.title } })
      const stream = fs.createWriteStream(targetPath)
      pdf.pipe(stream)

      // Регистрируем системный шрифт с поддержкой кириллицы, если доступен
      const fontCandidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        'C:\\Windows\\Fonts\\arial.ttf',
        '/Library/Fonts/Arial.ttf',
        '/System/Library/Fonts/Supplemental/Arial.ttf',
      ]
      let fontPath = ''
      for (const fp of fontCandidates) {
        if (fs.existsSync(fp)) {
          fontPath = fp
          break
        }
      }
      if (fontPath) pdf.font(fontPath)

      pdf.fontSize(14).text(doc.title, { align: 'center' })
      pdf.moveDown()
      pdf.fontSize(10).text(`№ ${doc.number}`, { align: 'right' })
      pdf.text(`Статус: ${doc.status}`, { align: 'right' })
      pdf.text(`Создан: ${doc.created_at}`, { align: 'right' })
      pdf.moveDown()
      pdf.fontSize(11).text(doc.body_rendered)
      pdf.moveDown()

      if (steps.length) {
        pdf.fontSize(12).text('Маршрут согласования:', { underline: true })
        pdf.moveDown(0.5)
        for (const s of steps) {
          pdf
            .fontSize(10)
            .text(
              `${s.step_order}. ${s.approver_name} — ${s.status}` +
                (s.comment ? ` (${s.comment})` : '') +
                (s.acted_at ? ` [${s.acted_at}]` : ''),
            )
        }
      }
      pdf.end()
      stream.on('finish', () => resolve(targetPath))
      stream.on('error', reject)
    } catch (e) {
      reject(e as Error)
    }
  })
}
