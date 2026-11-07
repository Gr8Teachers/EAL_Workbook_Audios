(function () {
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function norm(x) { return (x || '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[\s.,;:!?"]+/g, ' ').trim().toLowerCase(); }
  $$('.wb > ol').forEach(function (ol) {
    var n = parseInt(ol.getAttribute('start') || '1', 10);
    $$(':scope > li', ol).forEach(function (li) { li.setAttribute('data-n', n++); });
  });
  if (window.top !== window.self) { var bk = $('.backlink'); if (bk) bk.style.display = 'none'; }

  // Audio players + speed
  $$('.track').forEach(function (t) {
    var au = $('audio', t), sp = $('.speed', t);
    if (!au || !sp) return;
    au.addEventListener('error', function () { au.style.display = 'none'; sp.style.display = 'none'; var m = $('.missing', t); if (m) m.classList.remove('hidden'); });
    $$('button', sp).forEach(function (b) {
      b.onclick = function () { au.playbackRate = +b.dataset.rate; $$('button', sp).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); };
    });
  });
  $$('audio').forEach(function (a) { a.addEventListener('play', function () { $$('audio').forEach(function (o) { if (o !== a) o.pause(); }); }); });

  // Multiple-choice options
  $$('.mcq').forEach(function (g) {
    var single = g.classList.contains('single');
    // the blank in the question just before this group, if any
    var prev = g.previousElementSibling, blank = prev ? prev.querySelector('.blank') : null;
    $$('.opt', g).forEach(function (o) {
      o.onclick = function () {
        $$('.opt', g).forEach(function (x) { x.classList.remove('right', 'wrong'); });
        if (single) $$('.opt', g).forEach(function (x) { if (x !== o) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); } });
        o.classList.toggle('on'); o.setAttribute('aria-pressed', o.classList.contains('on'));
        if (blank && single) blank.value = o.classList.contains('on') ? $('.tx', o).textContent.trim() : '';
      };
    });
  });

  // Tick boxes left in grid tables
  $$('.wb td.box').forEach(function (c) {
    c.tabIndex = 0; c.setAttribute('role', 'checkbox'); c.setAttribute('aria-checked', 'false');
    function toggle() {
      var tbl = c.closest('table');
      $$('td.box', tbl).forEach(function (x) { x.classList.remove('right', 'wrong'); });
      if (tbl.classList.contains('single') && !c.classList.contains('on'))
        $$('td.box', tbl).forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
      c.classList.toggle('on'); c.setAttribute('aria-checked', c.classList.contains('on'));
    }
    c.onclick = toggle;
    c.onkeydown = function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } };
  });

  // Chips (yes/no, true/false, ☐ options in a cell): one choice per group
  $$('.chipgroup').forEach(function (g) {
    $$('.chip', g).forEach(function (b) {
      b.onclick = function () {
        $$('.chip', g).forEach(function (x) { x.classList.remove('right', 'wrong'); if (x !== b) x.classList.remove('on'); });
        b.classList.toggle('on');
      };
    });
  });

  // Write-in cells
  $$('.wb td.fill').forEach(function (c) {
    var ed = document.createElement('div'); ed.contentEditable = 'true'; ed.className = 'typed'; ed.setAttribute('aria-label', 'Type your answer');
    c.insertBefore(ed, c.firstChild);
    c.addEventListener('click', function () { ed.focus(); });
    ed.addEventListener('input', function () { c.classList.remove('right', 'wrong'); });
  });
  // Ordering tables (an "Order" column numbered 1..n): drag rows into order instead
  $$('.wb table').forEach(function (tbl) {
    var rows = $$('tr', tbl).filter(function (r) { return r.querySelector('td'); });
    if (rows.length < 2) return;
    var col = null;
    rows.forEach(function (r) { $$('td.fill[data-answer]', r).forEach(function (c) { if (col === null) col = c.cellIndex; }); });
    if (col === null) return;
    var cells = rows.map(function (r) { return r.cells[col]; });
    if (!cells.every(function (c) { return c && c.classList.contains('fill') && c.dataset.answer; })) return;
    var nums = cells.map(function (c) { return parseInt(c.dataset.answer, 10); });
    var sorted = nums.slice().sort(function (a, b) { return a - b; });
    if (!sorted.every(function (n, i) { return n === i + 1; })) return;
    tbl.classList.add('ordering');
    var body = rows[0].parentNode, head = $('tr', tbl);
    if (head && head.querySelector('th')) {
      var th = document.createElement('th'); th.textContent = 'Order'; th.className = 'oh';
      head.insertBefore(th, head.firstChild); if (head.cells[col + 1]) head.cells[col + 1].style.display = 'none';
    }
    rows.forEach(function (r, i) {
      var c = r.cells[col]; r.dataset.answer = parseInt(c.dataset.answer, 10); r.dataset.start = i;
      c.style.display = 'none'; c.classList.remove('fill'); c.removeAttribute('data-answer');
      var h = document.createElement('td'); h.className = 'handle';
      h.innerHTML = '<span class="grip" aria-hidden="true">⠿</span><span class="pos"></span>' +
        '<span class="arrows"><button type="button" class="up" aria-label="Move up">▲</button><button type="button" class="dn" aria-label="Move down">▼</button></span>' +
        '<span class="ans">' + r.dataset.answer + '</span>';
      r.insertBefore(h, r.firstChild);
      $('.up', h).onclick = function (e) { e.stopPropagation(); var p = r.previousElementSibling; if (p && p.querySelector('td')) { body.insertBefore(r, p); renumber(); } };
      $('.dn', h).onclick = function (e) { e.stopPropagation(); var n = r.nextElementSibling; if (n) { body.insertBefore(n, r); renumber(); } };
      // pointer drag (mouse, pen and touch)
      $('.grip', h).addEventListener('pointerdown', function (e) {
        e.preventDefault(); r.classList.add('dragging');
        function move(ev) {
          var y = ev.clientY;
          var list = $$('tr', body).filter(function (x) { return x !== r && x.querySelector('td'); });
          var before = null;
          for (var k = 0; k < list.length; k++) { var b = list[k].getBoundingClientRect(); if (y < b.top + b.height / 2) { before = list[k]; break; } }
          if (before) { if (before !== r.nextElementSibling) body.insertBefore(r, before); }
          else if (r !== body.lastElementChild) body.appendChild(r);
          renumber();
        }
        function up() { r.classList.remove('dragging'); document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); }
        document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
      });
    });
    function renumber() {
      $$('tr', body).filter(function (x) { return x.querySelector('td.handle'); }).forEach(function (x, i) {
        $('.pos', x).textContent = i + 1; x.classList.remove('right', 'wrong');
      });
    }
    tbl._renumber = renumber; renumber();
    var tip = document.createElement('div'); tip.className = 'hint'; tip.textContent = 'Drag ⠿ (or use ▲ ▼) to put the rows in order.';
    tbl.parentNode.insertBefore(tip, tbl);
  });
  // Matching tables (letter answers that point to lettered options in another column): draw lines
  var SVGNS = 'http://www.w3.org/2000/svg';
  $$('.wb table').forEach(function (tbl) {
    if (tbl.classList.contains('ordering')) return;
    var rows = $$('tr', tbl).filter(function (r) { return r.querySelector('td'); });
    if (rows.length < 2) return;
    var ncol = Math.max.apply(null, rows.map(function (r) { return r.cells.length; }));
    var ansCol = null, optCol = null;
    for (var c = 0; c < ncol; c++) {
      var cells = rows.map(function (r) { return r.cells[c]; });
      if (ansCol === null && cells.some(function (x) { return x && x.classList.contains('fill') && /^[A-Za-z]\.?$/.test((x.dataset.answer || '').trim()); }) &&
          cells.every(function (x) { return x && (x.classList.contains('fill') ? /^[A-Za-z]\.?$/.test((x.dataset.answer || '').trim()) : /^[A-Za-z]\.?$/.test(x.textContent.trim())); }))
        ansCol = c;
      else if (optCol === null && cells.every(function (x) { return x && (/^[A-Z][.)]\s*\S/.test(x.textContent.trim()) || x.querySelector('ol[type="A"] > li')); })) optCol = c;
    }
    if (ansCol === null || optCol === null) return;
    var letterOf = function (t) { return t.trim().charAt(0).toUpperCase(); };
    var wrap = tbl.closest('.tablewrap') || tbl;
    var box = document.createElement('div'); box.className = 'matcher';
    var head = $('tr', tbl), heads = head && head.querySelector('th') ? $$('th', head).map(function (h) { return h.textContent.trim(); }) : [];
    var L = document.createElement('div'), R = document.createElement('div'), svg = document.createElementNS(SVGNS, 'svg');
    L.className = 'mcol left'; R.className = 'mcol right'; svg.setAttribute('class', 'mlines');
    var lh = heads.filter(function (h, i) { return i !== ansCol && i !== optCol; }).join(' · '), rh = heads[optCol] || '';
    if (lh || rh) { var a = document.createElement('div'); a.className = 'mh'; a.textContent = lh; L.appendChild(a); var b = document.createElement('div'); b.className = 'mh'; b.textContent = rh; R.appendChild(b); }
    var items = [], opts = {};
    rows.forEach(function (r) {
      var ac = r.cells[ansCol], fixed = !ac.classList.contains('fill');
      var key = letterOf(fixed ? ac.textContent : ac.dataset.answer);
      var it = document.createElement('div'); it.className = 'mitem'; it.dataset.key = key;
      $$('td', r).forEach(function (td, i) { if (i === ansCol || i === optCol) return; var d = document.createElement('div'); d.className = 'mc'; while (td.firstChild) d.appendChild(td.firstChild); it.appendChild(d); });
      var dot = document.createElement('span'); dot.className = 'dot'; it.appendChild(dot);
      L.appendChild(it); items.push(it);
      if (fixed) it.dataset.fixed = key;
      var oc = r.cells[optCol], ol = /^[A-Z][.)]/.test(oc.textContent.trim()) ? letterOf(oc.textContent) : String.fromCharCode(65 + rows.indexOf(r));
      $$('ol', oc).forEach(function (l) { while (l.firstChild) { var li = l.firstChild; if (li.nodeType === 1) { while (li.firstChild) l.parentNode.insertBefore(li.firstChild, l); l.removeChild(li); } else l.removeChild(li); } l.parentNode.removeChild(l); });
      if (!/^[A-Z][.)]/.test(oc.textContent.trim())) oc.insertBefore(document.createTextNode(ol + '. '), oc.firstChild);
      var o = document.createElement('div'); o.className = 'mopt'; o.dataset.letter = ol;
      var d2 = document.createElement('span'); d2.className = 'dot'; o.appendChild(d2);
      var t2 = document.createElement('div'); t2.className = 'mc'; while (oc.firstChild) t2.appendChild(oc.firstChild); o.appendChild(t2);
      R.appendChild(o); opts[ol] = o;
      ac.removeAttribute('data-answer'); ac.classList.remove('fill');
    });
    box.appendChild(L); box.appendChild(svg); box.appendChild(R);
    var tip = document.createElement('div'); tip.className = 'hint'; tip.textContent = 'Draw a line from each item to its match: drag from a dot, or tap an item and then its match. Tap a line’s item again to remove it.';
    wrap.parentNode.insertBefore(tip, wrap); wrap.parentNode.insertBefore(box, wrap); wrap.style.display = 'none';
    box._links = {};   // item index -> letter
    items.forEach(function (it, i) { if (it.dataset.fixed && opts[it.dataset.fixed]) box._links[i] = it.dataset.fixed; });
    box._fixed = Object.assign({}, box._links);
    var sel = null, temp = null;
    function centre(el) { var d = $('.dot', el).getBoundingClientRect(), b = svg.getBoundingClientRect(); return [d.left + d.width / 2 - b.left, d.top + d.height / 2 - b.top]; }
    function line(p, q, cls) { var l = document.createElementNS(SVGNS, 'line'); l.setAttribute('x1', p[0]); l.setAttribute('y1', p[1]); l.setAttribute('x2', q[0]); l.setAttribute('y2', q[1]); l.setAttribute('class', cls || ''); svg.appendChild(l); return l; }
    function draw() {
      var b = box.getBoundingClientRect(); svg.setAttribute('width', b.width); svg.setAttribute('height', b.height);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      if (box.classList.contains('show')) items.forEach(function (it) { if (opts[it.dataset.key]) line(centre(it), centre(opts[it.dataset.key]), 'key'); });
      Object.keys(box._links).forEach(function (i) {
        var it = items[i], o = opts[box._links[i]]; if (!o) return;
        var st = box._fixed[i] ? 'fixed' : (it.dataset.mark || '');
        line(centre(it), centre(o), 'link ' + st);
      });
      items.forEach(function (it, i) { it.classList.toggle('linked', i in box._links); });
      $$('.mopt', R).forEach(function (o) { o.classList.toggle('linked', Object.keys(box._links).some(function (i) { return box._links[i] === o.dataset.letter; })); });
    }
    box._draw = draw;
    function link(i, letter) {
      Object.keys(box._links).forEach(function (k) { if (box._links[k] === letter && !box._fixed[k]) delete box._links[k]; });
      box._links[i] = letter; items[i].dataset.mark = ''; draw();
    }
    items.forEach(function (it, i) {
      if (it.dataset.fixed) { it.classList.add('fixedrow'); return; }
      it.addEventListener('click', function () {
        if (i in box._links && sel !== i) { delete box._links[i]; items[i].dataset.mark = ''; sel = null; items.forEach(function (x) { x.classList.remove('sel'); }); draw(); return; }
        sel = sel === i ? null : i; items.forEach(function (x, k) { x.classList.toggle('sel', k === sel); });
      });
      $('.dot', it).addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation(); var p = centre(it);
        function mv(ev) { var b = svg.getBoundingClientRect(); if (temp) svg.removeChild(temp); temp = line(p, [ev.clientX - b.left, ev.clientY - b.top], 'temp'); }
        function up(ev) {
          document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
          if (temp) { svg.removeChild(temp); temp = null; }
          var el = document.elementFromPoint(ev.clientX, ev.clientY), o = el && el.closest('.mopt');
          if (o && R.contains(o)) link(i, o.dataset.letter);
        }
        document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
      });
    });
    Object.keys(opts).forEach(function (letter) {
      opts[letter].addEventListener('click', function () {
        if (sel === null) return; link(sel, letter); items[sel].classList.remove('sel'); sel = null;
      });
    });
    window.addEventListener('resize', draw);
    $$('img', box).forEach(function (im) { im.addEventListener('load', draw); });
    setTimeout(draw, 50);
  });
  // Letter / number answers: offer a drop-down instead of typing
  $$('.wb table').forEach(function (tbl) {
    var cols = {};
    $$('td.fill[data-answer]', tbl).forEach(function (c) { (cols[c.cellIndex] = cols[c.cellIndex] || []).push(c); });
    Object.keys(cols).forEach(function (k) {
      var cs = cols[k], vals = cs.map(function (c) { return c.dataset.answer.trim().replace(/\.$/, ''); });
      if (cs.length < 2 || !vals.every(function (v) { return /^([A-Za-z]|\d{1,2})$/.test(v); })) return;
      var opts = vals.slice().sort(function (a, b) { return isNaN(a) ? a.localeCompare(b) : a - b; })
        .filter(function (v, i, a) { return a.indexOf(v) === i; });
      cs.forEach(function (c) {
        var sel = document.createElement('select'); sel.className = 'pick'; sel.setAttribute('aria-label', 'Choose an answer');
        sel.innerHTML = '<option value="">–</option>' + opts.map(function (o) { return '<option>' + o + '</option>'; }).join('');
        var ed = $('.typed', c); if (ed) ed.style.display = 'none';
        c.insertBefore(sel, c.firstChild); c.classList.add('haspick');
        sel.addEventListener('change', function () { c.classList.remove('right', 'wrong'); if (ed) ed.textContent = sel.value; });
      });
    });
  });
  $$('.openans textarea').forEach(function (t) {
    t.addEventListener('input', function () { t.classList.remove('right', 'wrong'); t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; });
  });

  // Listen-and-repeat tables: tap a row once it has been practised
  if (/\b(repeat|say|read|point|practi[sc]e|listen)\b/i.test(($('.wb') || {}).textContent || '')) {
    $$('.wb table').forEach(function (t) {
      if ($('td.fill, td.box, .chip, .pick', t)) return;
      t.classList.add('practise');
      $$('tr', t).forEach(function (tr) {
        if (!tr.querySelector('td')) return;
        tr.tabIndex = 0; tr.title = 'Tap when you have said it';
        tr.onclick = function () { tr.classList.toggle('done'); };
        tr.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tr.classList.toggle('done'); } };
      });
    });
  }
  // "Underline / circle / highlight" activities: tap words to mark them
  var wbEl = $('.wb');
  if (wbEl && /\b(underline|circle|highlight)\b/i.test(wbEl.textContent)) {
    var started = false;
    $$('p, td, li', wbEl).forEach(function (el) {
      if (!started) { if (/\b(underline|circle|highlight)\b/i.test(el.textContent)) started = true; return; }
      if (el.querySelector('p, td, li, img, input, button, textarea')) return;
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], n;
      while ((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(function (tn) {
        if (!tn.nodeValue.trim()) return;
        var frag = document.createDocumentFragment();
        tn.nodeValue.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
          var sp = document.createElement('span'); sp.className = 'mark'; sp.textContent = w;
          sp.onclick = function () { sp.classList.toggle('on'); };
          frag.appendChild(sp);
        });
        tn.parentNode.replaceChild(frag, tn);
      });
    });
    if (started) { var tip = document.createElement('p'); tip.className = 'hint'; tip.textContent = 'Tap a word to underline it. Tap again to remove the line.'; wbEl.insertBefore(tip, wbEl.firstChild); }
  }
  var root = $('main'), score = $('.score'), check = $('#check'), show = $('#show'), reset = $('#reset');
  var checkable = $$('.matcher .mitem, table.ordering tr, .mcq .opt[data-key], .wb td.box[data-key], .chip[data-key], .wb td.fill[data-answer], .openans textarea[data-answer]').length;
  if (check) {
    if (!checkable) check.style.display = 'none';
    check.onclick = function () {
      var right = 0, total = 0;
      $$('.mcq').forEach(function (g) {
        var opts = $$('.opt[data-key]', g); if (!opts.length) return; total++;
        if (opts.every(function (o) { return o.classList.contains('on') === (o.dataset.key === '1'); })) right++;
        opts.forEach(function (o) { o.classList.remove('right', 'wrong'); if (o.classList.contains('on')) o.classList.add(o.dataset.key === '1' ? 'right' : 'wrong'); });
      });
      $$('.wb table').forEach(function (t) {
        var boxes = $$('td.box[data-key]', t); if (!boxes.length) return; total++;
        if (boxes.every(function (b) { return b.classList.contains('on') === (b.dataset.key === '1'); })) right++;
        boxes.forEach(function (b) { b.classList.remove('right', 'wrong'); if (b.classList.contains('on')) b.classList.add(b.dataset.key === '1' ? 'right' : 'wrong'); });
      });
      $$('.chipgroup').forEach(function (g) {
        var cs = $$('.chip[data-key]', g); if (!cs.length) return; total++;
        var on = $('.chip.on', g);
        if (on) { var ok = on.dataset.key === '1'; on.classList.add(ok ? 'right' : 'wrong'); if (ok) right++; }
      });
      $$('.matcher').forEach(function (m) {
        $$('.mitem', m).forEach(function (it, i) {
          if (m._fixed[i]) return; total++;
          var got = m._links[i]; it.dataset.mark = got ? (got === it.dataset.key ? 'right' : 'wrong') : '';
          if (got === it.dataset.key) right++;
        });
        m._draw();
      });
      $$('table.ordering').forEach(function (t) {
        $$('tr', t).filter(function (x) { return x.querySelector('td.handle'); }).forEach(function (x, i) {
          total++; var ok = +x.dataset.answer === i + 1; x.classList.remove('right', 'wrong'); x.classList.add(ok ? 'right' : 'wrong'); if (ok) right++;
        });
      });
      $$('.wb td.fill[data-answer]').forEach(function (c) {
        total++; var v = norm($('.typed', c).textContent); c.classList.remove('right', 'wrong');
        if (!v) return;
        var ok = v === norm(c.dataset.answer); c.classList.add(ok ? 'right' : 'wrong'); if (ok) right++;
      });
      $$('.openans textarea[data-answer]').forEach(function (t) {
        total++; var v = norm(t.value); t.classList.remove('right', 'wrong');
        if (!v) return;
        var ok = v === norm(t.dataset.answer); t.classList.add(ok ? 'right' : 'wrong'); if (ok) right++;
      });
      score.textContent = 'You got ' + right + ' out of ' + total + ' right.';
      score.classList.remove('hidden');
    };
  }
  if (show) {
    if (!$('.answers') && !$$('.wb .ans').length && !checkable) show.style.display = 'none';
    show.onclick = function () { var on = root.classList.toggle('reveal'); $$('.matcher').forEach(function (m) { m.classList.toggle('show', on); m._draw(); }); show.textContent = on ? 'Hide answers' : 'Show answers'; };
  }
  var anyInput = $$('.matcher, table.ordering, .opt, .chip, .wb td.box, .wb td.fill, .openans, .blank, table.practise, .mark').length;
  if (reset && !anyInput) reset.style.display = 'none';
  if (reset) reset.onclick = function () {
    $$('.matcher').forEach(function (m) { m._links = Object.assign({}, m._fixed); $$('.mitem', m).forEach(function (it) { it.dataset.mark = ''; it.classList.remove('sel'); }); m.classList.remove('show'); m._draw(); });
    $$('table.ordering').forEach(function (t) {
      var rs = $$('tr', t).filter(function (x) { return x.querySelector('td.handle'); });
      rs.sort(function (a, b) { return a.dataset.start - b.dataset.start; }).forEach(function (x) { x.parentNode.appendChild(x); });
      t._renumber();
    });
    $$('tr.done').forEach(function (r) { r.classList.remove('done'); }); $$('.mark.on').forEach(function (m) { m.classList.remove('on'); });
    $$('.opt, .chip, .wb td.box').forEach(function (b) { b.classList.remove('on', 'right', 'wrong'); });
    $$('.wb td.fill').forEach(function (c) { c.classList.remove('right', 'wrong'); });
    $$('.wb .typed').forEach(function (e) { e.textContent = ''; }); $$('.pick').forEach(function (p) { p.value = ''; });
    $$('.openans textarea').forEach(function (t) { t.value = ''; t.classList.remove('right', 'wrong'); });
    $$('.blank').forEach(function (b) { b.value = ''; });
    root.classList.remove('reveal'); if (show) show.textContent = 'Show answers';
    if (score) score.classList.add('hidden');
  };
})();
