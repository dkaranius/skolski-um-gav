import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { saveAs } from 'file-saver';
import { GeneratedDocument } from '../types';

export async function exportDocumentToWord(
  docData: GeneratedDocument,
  fileNamePrefix = 'Skolski_akt'
): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: docData.schoolHeaderPlaceholder,
          bold: true,
          size: 22,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: docData.klasaPlaceholder,
          size: 20,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: docData.urbrojPlaceholder,
          size: 20,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: docData.placeAndDate,
          size: 20,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 280 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: docData.recipientPlaceholder,
          size: 21,
          font: 'Calibri',
        }),
      ],
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: docData.legalBasis,
          size: 22,
          font: 'Calibri',
        }),
      ],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 240 },
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: docData.documentTitle,
          bold: true,
          size: 26,
          font: 'Calibri',
          color: '0F172A',
        }),
      ],
      spacing: { before: 120, after: 240 },
    }),
  ];

  for (const para of docData.bodyParagraphs) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: para,
            size: 22,
            font: 'Calibri',
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 160 },
      })
    );
  }

  if (docData.explanationParagraphs.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'O b r a z l o ž e n j e',
            bold: true,
            size: 22,
            font: 'Calibri',
          }),
        ],
        spacing: { before: 220, after: 140 },
      })
    );

    for (const exp of docData.explanationParagraphs) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: exp,
              size: 22,
              font: 'Calibri',
            }),
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 140 },
        })
      );
    }
  }

  if (docData.legalRemedy) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'UPUTA O PRAVNOM LIJEKU / NAPOMENA: ',
            bold: true,
            size: 20,
            font: 'Calibri',
          }),
          new TextRun({
            text: docData.legalRemedy,
            size: 20,
            font: 'Calibri',
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 180, after: 320 },
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: docData.signatureBlock,
          size: 22,
          font: 'Calibri',
        }),
      ],
      spacing: { before: 240 },
    })
  );

  const wordDoc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(wordDoc);
  const safeName = fileNamePrefix
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_');
  saveAs(blob, `${safeName}_${new Date().toISOString().slice(0, 10)}.docx`);
}
