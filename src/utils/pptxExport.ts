import pptxgen from 'pptxgenjs';
import { AnonymizedClassStats, GeneratedPresentation } from '../types';

export async function exportPresentationToPptx(
  deck: GeneratedPresentation,
  stats: AnonymizedClassStats | null,
  schoolName = 'Školska ustanova'
): Promise<void> {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = deck.deckTitle;
  pptx.subject = deck.deckSubtitle;
  pptx.author = schoolName;

  const NAVY = '0F172A';
  const BLUE = '1D4ED8';
  const SLATE_TEXT = '334155';
  const MUTED = '64748B';
  const BG_LIGHT = 'F8FAFC';

  for (let idx = 0; idx < deck.slides.length; idx++) {
    const s = deck.slides[idx];
    const slide = pptx.addSlide();

    if (idx === 0 || s.layout === 'title') {
      slide.background = { color: NAVY };
      slide.addText(schoolName.toUpperCase(), {
        x: 0.8,
        y: 1.0,
        w: 8.4,
        h: 0.4,
        fontSize: 12,
        bold: true,
        color: '93C5FD',
        fontFace: 'Calibri',
      });
      slide.addText(deck.deckTitle, {
        x: 0.8,
        y: 1.7,
        w: 8.4,
        h: 1.4,
        fontSize: 32,
        bold: true,
        color: 'FFFFFF',
        fontFace: 'Calibri',
      });
      slide.addText(deck.deckSubtitle || s.subtitle || '', {
        x: 0.8,
        y: 3.2,
        w: 8.4,
        h: 0.8,
        fontSize: 16,
        color: 'CBD5E1',
        fontFace: 'Calibri',
      });
      slide.addText(`Publika: ${deck.audience}  ·  Anonimizirani prikaz (GDPR usklađeno)`, {
        x: 0.8,
        y: 4.7,
        w: 8.4,
        h: 0.4,
        fontSize: 11,
        color: '94A3B8',
        fontFace: 'Calibri',
      });
      if (s.speakerNotes) slide.addNotes(s.speakerNotes);
      continue;
    }

    slide.background = { color: BG_LIGHT };
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.85,
      fill: { color: NAVY },
    });
    slide.addText(s.title, {
      x: 0.6,
      y: 0.18,
      w: 8.8,
      h: 0.5,
      fontSize: 20,
      bold: true,
      color: 'FFFFFF',
      fontFace: 'Calibri',
    });

    if (s.layout === 'chart_grades' && stats) {
      const dist = stats.gradeDistribution;
      const chartData = [
        {
          name: 'Broj učenika',
          labels: ['Odličan (5)', 'Vrlo dobar (4)', 'Dobar (3)', 'Dovoljan (2)', 'Nedovoljan (1)'],
          values: [dist.odlican, dist.vrloDobar, dist.dobar, dist.dovoljan, dist.nedovoljan],
        },
      ];
      slide.addChart(pptx.ChartType.bar, chartData, {
        x: 0.6,
        y: 1.2,
        w: 5.2,
        h: 3.7,
        barDir: 'col',
        chartColors: [BLUE],
        showValue: true,
        valAxisTitle: 'Učenici',
        showLegend: false,
      });
      slide.addText(
        s.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
        {
          x: 6.1,
          y: 1.3,
          w: 3.4,
          h: 3.6,
          fontSize: 13,
          color: SLATE_TEXT,
          fontFace: 'Calibri',
          paraSpaceAfter: 10,
        }
      );
    } else if (s.layout === 'chart_absences' && stats && stats.classBreakdown.length > 0) {
      const labels = stats.classBreakdown.map((c) => c.razred);
      const chartData = [
        {
          name: 'Prosjek opravdanih',
          labels,
          values: stats.classBreakdown.map((c) => c.avgJustifiedAbsences),
        },
        {
          name: 'Prosjek neopravdanih',
          labels,
          values: stats.classBreakdown.map((c) => c.avgUnjustifiedAbsences),
        },
      ];
      slide.addChart(pptx.ChartType.bar, chartData, {
        x: 0.6,
        y: 1.2,
        w: 5.4,
        h: 3.7,
        barDir: 'col',
        chartColors: ['0EA5E9', 'DC2626'],
        showValue: true,
        showLegend: true,
        legendPos: 'b',
      });
      slide.addText(
        s.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
        {
          x: 6.2,
          y: 1.3,
          w: 3.3,
          h: 3.6,
          fontSize: 13,
          color: SLATE_TEXT,
          fontFace: 'Calibri',
          paraSpaceAfter: 10,
        }
      );
    } else if (s.layout === 'kpi' && stats) {
      const kpis = [
        { label: 'Ukupno učenika', value: String(stats.totalStudents) },
        { label: 'Prosječna ocjena', value: stats.overallAvgGrade.toFixed(2) },
        { label: 'Opravdani sati', value: String(stats.totalJustifiedAbsences) },
        { label: 'Neopravdani sati', value: String(stats.totalUnjustifiedAbsences) },
      ];
      kpis.forEach((k, kIdx) => {
        const xPos = 0.6 + kIdx * 2.25;
        slide.addShape(pptx.ShapeType.rect, {
          x: xPos,
          y: 1.2,
          w: 2.05,
          h: 1.2,
          fill: { color: 'FFFFFF' },
          line: { color: 'CBD5E1', width: 1 },
        });
        slide.addText(k.value, {
          x: xPos + 0.15,
          y: 1.32,
          w: 1.75,
          h: 0.55,
          fontSize: 24,
          bold: true,
          color: BLUE,
          fontFace: 'Calibri',
        });
        slide.addText(k.label, {
          x: xPos + 0.15,
          y: 1.9,
          w: 1.75,
          h: 0.35,
          fontSize: 11,
          color: MUTED,
          fontFace: 'Calibri',
        });
      });
      slide.addText(
        s.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
        {
          x: 0.6,
          y: 2.75,
          w: 8.8,
          h: 2.2,
          fontSize: 15,
          color: SLATE_TEXT,
          fontFace: 'Calibri',
          paraSpaceAfter: 10,
        }
      );
    } else {
      slide.addText(
        s.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
        {
          x: 0.7,
          y: 1.3,
          w: 8.6,
          h: 3.7,
          fontSize: 16,
          color: SLATE_TEXT,
          fontFace: 'Calibri',
          paraSpaceAfter: 12,
        }
      );
    }

    slide.addText(`${schoolName}  ·  Slajd ${idx + 1}`, {
      x: 0.6,
      y: 5.2,
      w: 8.8,
      h: 0.3,
      fontSize: 10,
      color: MUTED,
      fontFace: 'Calibri',
    });

    if (s.speakerNotes) {
      slide.addNotes(s.speakerNotes);
    }
  }

  const safeTitle = deck.deckTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 40);
  await pptx.writeFile({
    fileName: `${safeTitle || 'Skolska_prezentacija'}_${new Date()
      .toISOString()
      .slice(0, 10)}.pptx`,
  });
}
