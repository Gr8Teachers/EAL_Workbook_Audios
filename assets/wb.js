(function () {
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function norm(x) { return (x || '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[\s.,;:!?"]+/g, ' ').trim().toLowerCase(); }
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
  var checkable = $$('.mcq .opt[data-key], .wb td.box[data-key], .chip[data-key], .wb td.fill[data-answer], .openans textarea[data-answer]').length;
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
    show.onclick = function () { var on = root.classList.toggle('reveal'); show.textContent = on ? 'Hide answers' : 'Show answers'; };
  }
  var anyInput = $$('.opt, .chip, .wb td.box, .wb td.fill, .openans, .blank, table.practise, .mark').length;
  if (reset && !anyInput) reset.style.display = 'none';
  if (reset) reset.onclick = function () {
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
