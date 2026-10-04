import { addProvider, type Block } from './plan';
import { medsFor } from './meds';
import { toMin } from './time';

/** Medications/skincare with their own time become individual blocks on the day plan (so they get their own reminder). */
addProvider((date): Block[] =>
  medsFor('timed', date).filter((m) => m.time).map((m) => {
    let start = toMin(m.time!); if (start < 240) start += 1440;
    return { id: 'med:' + m.id, order: 0, start, dur: 5, role: 'recovery', title: m.label, sub: m.sub, icon: 'medication', days: [], kind: 'med-item' };
  }));
