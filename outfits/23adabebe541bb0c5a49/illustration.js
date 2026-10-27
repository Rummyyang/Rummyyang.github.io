/** Original, schematic fashion illustrations. These are not fit simulations. */
let illustrationSequence = 0;

const OPTIONS = {
  top: ['tee', 'shirt', 'knit', 'polo', 'turtleneck', 'hoodie'],
  outer: ['none', 'blazer', 'jacket', 'coat', 'cardigan', 'overshirt', 'vest'],
  bottom: ['straight', 'wide', 'tapered', 'shorts'],
  shoes: ['sneakers', 'loafers', 'boots', 'derby'],
  detail: ['plain', 'stripe', 'cable', 'check'],
};
const DEFAULTS = {
  top: 'tee', outer: 'none', bottom: 'straight', shoes: 'sneakers', detail: 'plain',
  topColor: '#e9e4d9', outerColor: '#687067', bottomColor: '#393d3b',
  shoeColor: '#f3f0e8', background: '#eee9df',
};
const xml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
}[char]));
const token = (value) => String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'look';
const hex = (value, fallback) => typeof value === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value) ? value : fallback;
function tone(color, amount) {
  const source = color.length === 4 ? color.slice(1).split('').map((c) => c + c).join('') : color.slice(1);
  return '#' + [0, 2, 4].map((offset) => {
    const channel = parseInt(source.slice(offset, offset + 2), 16);
    return Math.round(amount > 0 ? channel + (255 - channel) * amount : channel * (1 + amount)).toString(16).padStart(2, '0');
  }).join('');
}

/** @returns {string} An accessible, self-contained SVG with instance-scoped IDs. */
export function renderLook(outfit = {}, suffix = '') {
  const input = outfit?.visual || {};
  const v = { ...DEFAULTS };
  Object.keys(OPTIONS).forEach((key) => { if (OPTIONS[key].includes(input[key])) v[key] = input[key]; });
  ['topColor', 'outerColor', 'bottomColor', 'shoeColor', 'background'].forEach((key) => { v[key] = hex(input[key], DEFAULTS[key]); });
  const uid = `atelier-${token(outfit?.id)}-${token(suffix)}-${++illustrationSequence}`;
  const ref = (name) => `url(#${uid}-${name})`;
  const line = '#33332f';
  const skin = '#c69a7b';
  const skinLight = '#d5ad8d';
  const topDark = tone(v.topColor, -0.29);
  const outerDark = tone(v.outerColor, -0.30);
  const bottomDark = tone(v.bottomColor, -0.32);
  const shortSleeve = v.top === 'tee' || v.top === 'polo';
  const topBody = 'M144 125 L165 116 Q180 121 195 116 L217 125 L221 186 L222 244 Q181 251 138 244 L140 186 Z';
  const leftSleeve = shortSleeve
    ? 'M145 125 Q134 125 129 137 L117 168 L139 176 L154 143 Z'
    : 'M145 125 Q131 126 126 145 L111 242 Q116 247 128 246 L144 188 L154 145 Z';
  const rightSleeve = shortSleeve
    ? 'M215 125 Q229 126 233 139 L245 168 L223 177 L207 144 Z'
    : 'M214 125 Q230 127 234 146 L251 242 Q243 248 233 247 L217 187 L206 145 Z';
  // Separate paths union in clipPath. Combining oppositely wound sleeve and torso
  // subpaths would cancel overlapping fabric and create triangular "holes".
  const topPieces = [leftSleeve, rightSleeve, topBody];
  const outerBody = v.outer === 'coat'
    ? 'M142 122 L165 114 L181 137 L197 114 L219 123 L225 202 L235 325 Q213 333 189 326 L181 269 L175 327 Q148 333 126 325 L137 204 Z'
    : v.outer === 'vest'
      ? 'M148 121 L164 114 L180 131 L197 114 L212 121 Q208 151 223 168 L221 244 Q181 252 139 244 L138 167 Q151 149 148 121 Z'
      : 'M142 122 L165 114 L181 136 L197 114 L219 123 L224 199 L226 251 Q202 256 184 252 L180 231 L176 253 Q153 256 135 250 L138 197 Z';
  const outerLeft = 'M144 123 Q130 122 124 140 L108 244 Q114 250 129 249 L145 190 L155 144 Z';
  const outerRight = 'M215 123 Q232 125 238 145 L254 244 Q247 251 233 250 L216 190 L205 144 Z';
  const hasOuterSleeves = v.outer !== 'none' && v.outer !== 'vest';
  const outerPieces = hasOuterSleeves ? [outerLeft, outerRight, outerBody] : [outerBody];
  const piecePaths = (pieces) => pieces.map((d) => `<path d="${d}"/>`).join('');
  const gradient = (name, color) => `<linearGradient id="${uid}-${name}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${tone(color, -0.12)}"/><stop offset=".35" stop-color="${tone(color, 0.035)}"/><stop offset=".69" stop-color="${color}"/><stop offset="1" stop-color="${tone(color, -0.17)}"/></linearGradient>`;
  const strokePath = (d, color = line, opacity = 0.23, width = 1) => `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const button = (x, y, color = outerDark, radius = 1.5) => `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}"/><circle cx="${x - .3}" cy="${y - .4}" r=".35" fill="#fff" opacity=".45"/>`;
  const patternLayer = (clip, name = v.detail, opacity = .38) => name === 'plain' ? '' : `<rect x="95" y="110" width="170" height="230" fill="${ref(name)}" clip-path="${ref(clip)}" opacity="${opacity}"/>`;

  function shoes() {
    const fill = ref('shoe');
    const seam = tone(v.shoeColor, -.32);
    let shapes = '';
    for (const right of [false, true]) {
      const transform = right ? 'translate(360 0) scale(-1 1)' : '';
      shapes += `<g transform="${transform}">`;
      if (v.shoes === 'boots') {
        shapes += `<path d="M140 409 L167 409 L169 431 Q168 437 157 440 L128 448 Q119 448 120 441 Q123 436 138 430 Z" fill="${fill}"/>`;
        shapes += strokePath('M143 412 L143 431 M157 411 L159 429 M128 442 Q147 442 166 433', seam, .56);
        shapes += '<path d="M120 444 Q141 446 169 435 L168 446 L124 451 Q119 451 120 444" fill="#34332e"/>';
      } else if (v.shoes === 'sneakers') {
        shapes += `<path d="M139 426 L166 426 L170 438 Q169 443 157 445 L123 446 Q118 440 125 437 L138 432 Z" fill="${fill}"/>`;
        shapes += `<path d="M120 442 Q141 445 170 437 L170 446 Q146 451 121 449 Z" fill="${tone(v.shoeColor, .48)}" stroke="${seam}" stroke-opacity=".3" stroke-width=".6"/>`;
        shapes += strokePath('M138 433 L153 437 M141 430 L156 434 M145 428 L160 431 M128 438 Q135 440 137 444', seam, .55, .9);
      } else {
        shapes += `<path d="M140 427 L167 427 L169 440 Q158 447 124 447 Q117 444 124 439 L139 432 Z" fill="${fill}"/>`;
        shapes += `<path d="M121 444 Q143 449 169 439 L169 446 Q144 452 122 450 Z" fill="${tone(v.shoeColor, -.28)}"/>`;
        shapes += v.shoes === 'loafers'
          ? strokePath('M132 437 Q143 440 158 435 M137 434 L153 438 M130 440 Q142 445 156 440', seam, .7, 1.2)
          : strokePath('M141 431 L155 435 M144 429 L159 432 M128 441 Q135 435 141 433', seam, .75, 1);
      }
      shapes += '</g>';
    }
    return shapes;
  }

  function pants() {
    const shapes = {
      straight: 'M145 234 Q180 239 216 234 L225 281 L225 427 Q209 432 191 427 L181 292 L170 428 Q151 434 134 428 L136 280 Z',
      wide: 'M141 234 Q181 239 220 234 L229 282 L239 430 Q214 436 189 429 L181 293 L172 430 Q148 438 120 429 L131 280 Z',
      tapered: 'M145 234 Q181 238 216 234 L225 278 L218 425 Q207 431 194 426 L181 292 L165 428 Q150 433 138 427 L135 279 Z',
      shorts: 'M145 234 Q181 239 216 234 L225 281 L226 331 Q209 336 188 331 L181 290 L173 331 Q150 338 133 331 L136 280 Z',
    };
    const hem = v.bottom === 'shorts' ? 329 : 425;
    return `<path d="${shapes[v.bottom]}" fill="${ref('bottom')}" stroke="${bottomDark}" stroke-width=".7"/>
      ${strokePath(`M145 242 Q181 247 216 242 M180 243 L180 278 Q184 286 181 292 M145 252 Q145 264 138 272 M216 252 Q215 263 223 273`, bottomDark, .7)}
      ${strokePath(`M155 272 Q150 327 149 ${hem} M205 272 Q210 328 210 ${hem}`, '#fff', .12, 1.1)}
      ${strokePath('M164 246 L162 265 M197 246 L199 265', bottomDark, .46)}
      <path d="M146 237 L145 247 M213 237 L214 247" stroke="${bottomDark}" stroke-width="2" opacity=".65"/>
      ${button(181, 241, bottomDark, 1.3)}`;
  }

  function top() {
    let result = `<g fill="${ref('top')}" stroke="${topDark}" stroke-opacity=".36" stroke-width=".8">${piecePaths(topPieces)}</g>`;
    result += `<rect x="95" y="110" width="170" height="230" fill="${ref('weave')}" clip-path="${ref('topclip')}" opacity=".38"/>`;
    result += patternLayer('topclip', v.detail);
    result += strokePath('M145 145 Q147 163 142 185 M215 145 Q213 163 219 185 M143 236 Q180 242 217 237', topDark, .3);
    if (shortSleeve) result += strokePath('M119 163 L140 171 M224 172 L243 163', topDark, .55);
    else result += strokePath('M112 236 L129 239 M232 240 L250 236 M127 193 L131 205 M235 195 L233 210', topDark, .48);
    if (v.top === 'shirt') {
      result += `<path d="M165 116 L180 127 L195 116 L202 126 L190 142 L180 130 L169 142 L158 126 Z" fill="${tone(v.topColor, .13)}" stroke="${topDark}" stroke-opacity=".5" stroke-width=".8"/>`;
      result += strokePath('M180 131 L180 244 M184 137 L184 241', topDark, .52, .7);
      [151, 173, 195, 217, 238].forEach((y) => { result += button(182, y, topDark, 1.15); });
      result += strokePath('M196 155 L211 157 L211 173 Q204 178 197 173 Z', topDark, .4, .8);
    } else if (v.top === 'polo') {
      result += `<path d="M165 116 L180 126 L195 116 L201 125 L189 139 L180 130 L169 140 L159 125 Z" fill="${tone(v.topColor, -.08)}" stroke="${topDark}" stroke-opacity=".5" stroke-width=".8"/>`;
      result += strokePath('M180 130 L180 158', topDark, .65, 1.7) + button(183, 142, topDark, 1) + button(183, 152, topDark, 1);
    } else if (v.top === 'turtleneck') {
      result += `<path d="M164 107 Q180 112 196 107 L197 124 Q180 131 163 124 Z" fill="${ref('top')}"/>`;
      result += strokePath('M165 111 Q180 117 195 111 M165 121 Q180 127 195 121', topDark, .55, .8);
    } else if (v.top === 'hoodie') {
      result += `<path d="M166 112 Q150 115 150 130 Q151 148 171 151 L180 133 L189 151 Q211 145 210 128 Q208 115 195 112 L180 125 Z" fill="${tone(v.topColor, -.07)}" stroke="${topDark}" stroke-opacity=".4" stroke-width=".8"/>`;
      result += strokePath('M169 137 L167 169 M190 137 L194 169', topDark, .6, 1.4);
      result += `<path d="M155 202 L167 191 L194 191 L208 202 L209 226 Q180 230 153 226 Z" fill="${tone(v.topColor, -.025)}" stroke="${topDark}" stroke-opacity=".28" stroke-width=".8"/>`;
      result += strokePath('M155 203 L164 212 M207 204 L198 212', topDark, .6);
    } else {
      result += `<path d="M164 116 Q180 137 196 116 L199 120 Q180 142 161 120 Z" fill="${tone(v.topColor, -.11)}"/>`;
      if (v.top === 'knit') {
        result += strokePath('M139 238 Q181 245 221 238 M139 241 Q181 248 221 241 M114 239 L129 242 M233 244 L249 240', topDark, .45, .8);
      }
    }
    return result;
  }

  function outer() {
    if (v.outer === 'none') return '';
    let result = `<g fill="${ref('outer')}" stroke="${outerDark}" stroke-opacity=".55" stroke-width=".8">${piecePaths(outerPieces)}</g>`;
    result += `<rect x="95" y="110" width="170" height="230" fill="${ref('weave')}" clip-path="${ref('outerclip')}" opacity=".52"/>`;
    if (v.outer === 'overshirt') result += patternLayer('outerclip', v.detail, .33);
    // The central opening reveals the underlying garment, rather than a flat cutout.
    result += `<g clip-path="${ref('opening')}">${top()}</g>`;
    if (v.outer === 'blazer' || v.outer === 'coat') {
      result += `<path d="M165 114 L153 136 L162 148 L153 160 L178 205 L172 146 Z M197 114 L210 137 L199 148 L209 160 L183 205 L190 145 Z" fill="${tone(v.outerColor, .045)}" stroke="${outerDark}" stroke-opacity=".6" stroke-width=".8"/>`;
      result += strokePath('M142 220 L163 223 L162 231 L141 229 M199 223 L220 220 L220 229 L200 232 M199 164 L216 161', outerDark, .65, .9);
      result += button(181, 212) + button(182, 236);
      if (v.outer === 'coat') result += strokePath('M140 257 L156 267 M207 267 L224 257 M134 321 Q152 326 173 322 M190 321 Q213 327 231 322', outerDark, .48);
    } else if (v.outer === 'cardigan') {
      result += strokePath('M165 116 L177 211 L178 250 M196 116 L184 211 L183 251', outerDark, .7, 4);
      [214, 231, 247].forEach((y) => { result += button(182, y, outerDark, 1.65); });
      result += strokePath('M144 217 L162 217 L162 238 L143 236 Z M200 217 L218 217 L219 237 L200 239 Z M138 245 Q156 249 174 246 M188 246 Q205 249 222 245', outerDark, .45, .9);
    } else if (v.outer === 'vest') {
      result += strokePath('M165 115 L180 170 L196 115 M180 170 L180 248 M144 221 L161 221 M201 221 L219 221', outerDark, .65, 1.3);
      [184, 206, 229, 246].forEach((y) => { result += button(180, y, outerDark, 1.4); });
      result += strokePath('M150 123 Q151 150 141 167 M210 123 Q209 148 220 167', outerDark, .6, 1.8);
    } else {
      result += `<path d="M165 114 L180 129 L197 114 L204 129 L191 144 L180 133 L168 145 L155 130 Z" fill="${tone(v.outerColor, .055)}" stroke="${outerDark}" stroke-opacity=".6" stroke-width=".8"/>`;
      result += strokePath('M178 142 L178 250 M184 142 L184 250', outerDark, .55, .9);
      if (v.outer === 'overshirt') {
        result += strokePath('M145 160 L166 160 L166 184 Q156 189 145 183 Z M196 160 L216 160 L217 184 Q206 189 196 184 Z M145 166 L166 166 M196 166 L216 166', outerDark, .58, .8);
        [154, 178, 202, 226, 247].forEach((y) => { result += button(182, y, outerDark, 1.5); });
      } else {
        result += strokePath('M143 212 L159 203 M203 203 L219 211 M138 243 Q158 249 175 245 M187 245 Q205 249 222 243', outerDark, .65, 1.1);
        result += `<rect x="177.5" y="222" width="3" height="7" rx="1" fill="${tone(v.outerColor, .35)}"/>`;
      }
    }
    if (hasOuterSleeves) {
      result += strokePath('M110 238 L130 242 M232 243 L252 238 M137 152 L130 194 M223 153 L232 195 M119 211 L127 216 M241 214 L234 218', outerDark, .52, .9);
      result += button(117, 243, outerDark, 1) + button(245, 243, outerDark, 1);
    }
    return result;
  }

  const openingPath = v.outer === 'coat'
    ? 'M165 115 L180 128 L197 115 L188 242 L181 270 L174 243 Z'
    : v.outer === 'vest'
      ? 'M165 115 L180 128 L196 115 L182 167 L178 167 Z'
      : 'M165 115 L180 129 L197 115 L186 222 L180 235 L174 223 Z';
  const accessibleTitle = `${outfit?.title || '穿搭'} · 原创服装示意，非真人试穿`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 500" role="img" aria-label="${xml(accessibleTitle)}" aria-labelledby="${uid}-title" preserveAspectRatio="xMidYMid meet">
    <title id="${uid}-title">${xml(accessibleTitle)}</title>
    <defs>
      ${gradient('top', v.topColor)}${gradient('outer', v.outerColor)}${gradient('bottom', v.bottomColor)}${gradient('shoe', v.shoeColor)}
      <linearGradient id="${uid}-skin" x1="0" x2="1"><stop stop-color="${skin}"/><stop offset=".55" stop-color="${skinLight}"/><stop offset="1" stop-color="${skin}"/></linearGradient>
      <radialGradient id="${uid}-light"><stop stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <pattern id="${uid}-weave" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 1 L2 0 M3 5 L5 4" stroke="#fff" stroke-opacity=".22" stroke-width=".6"/><path d="M0 4 L1 5 M4 0 L5 1" stroke="#292821" stroke-opacity=".1" stroke-width=".5"/></pattern>
      <pattern id="${uid}-stripe" width="10" height="12" patternUnits="userSpaceOnUse"><path d="M0 3 H10 M0 5 H10" stroke="${topDark}" stroke-width="1.1"/></pattern>
      <pattern id="${uid}-check" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M2 0 V22 M5 0 V22 M0 2 H22 M0 5 H22" stroke="${topDark}" stroke-width=".7"/><path d="M13 0 V22 M0 13 H22" stroke="${tone(v.topColor, .5)}" stroke-width="2"/></pattern>
      <pattern id="${uid}-cable" width="16" height="24" patternUnits="userSpaceOnUse"><path d="M6 0 C14 6 2 6 10 12 S2 18 10 24 M10 0 C2 6 14 6 6 12 S14 18 6 24" fill="none" stroke="${topDark}" stroke-width=".85"/><path d="M1 0 V24" stroke="${topDark}" stroke-width=".5"/></pattern>
      <clipPath id="${uid}-topclip">${piecePaths(topPieces)}</clipPath>
      <clipPath id="${uid}-outerclip">${piecePaths(outerPieces)}</clipPath>
      <clipPath id="${uid}-opening"><path d="${openingPath}"/></clipPath>
    </defs>
    <rect width="360" height="500" fill="${v.background}"/>
    <ellipse cx="180" cy="217" rx="162" ry="222" fill="${ref('light')}"/>
    <path d="M39 452 H322" stroke="${tone(v.background, -.12)}" stroke-width=".6"/>
    <ellipse cx="181" cy="450" rx="72" ry="7" fill="#494139" opacity=".11"/>
    ${v.bottom === 'shorts' ? `<path d="M140 321 L169 321 L163 432 L140 432 Z M191 321 L218 321 L217 431 L195 431 Z" fill="${ref('skin')}"/>` : ''}
    ${shoes()}
    ${pants()}
    <path d="M126 162 L139 170 L128 226 L122 251 L112 249 L115 222 Z M224 170 L238 162 L245 222 L250 250 L240 253 L232 227 Z" fill="${ref('skin')}"/>
    <path d="M168 99 L166 119 Q180 134 197 118 L193 99 Z" fill="${ref('skin')}"/>
    ${strokePath('M169 106 Q180 112 193 105', '#795b47', .2, 1)}
    <ellipse cx="162" cy="82" rx="3" ry="6" fill="${skin}"/><ellipse cx="198" cy="82" rx="3" ry="6" fill="${skin}"/>
    <path d="M162 72 Q164 55 181 55 Q198 55 199 74 L196 92 Q193 107 180 110 Q167 105 164 93 Z" fill="${ref('skin')}"/>
    <path d="M161 78 Q155 62 167 55 Q183 47 195 57 Q204 63 199 80 L194 72 L192 64 Q177 72 165 67 L165 79 Z" fill="#3b3631"/>
    ${strokePath('M166 60 Q176 54 187 57', '#746454', .48, 1.4)}
    ${top()}
    ${outer()}
    <path d="M112 245 L124 248 L124 258 L120 270 Q117 274 114 270 L111 260 Z M238 249 L250 246 L252 261 L248 271 Q245 274 241 270 L238 261 Z" fill="${ref('skin')}"/>
    ${strokePath('M116 256 L116 266 M120 255 L120 263 M243 255 L244 266 M247 254 L248 264', '#795b47', .3, .75)}
  </svg>`;
}
