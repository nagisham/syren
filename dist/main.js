import { struct as j, is_not_null as b, is_null as y, unpack as m, is_object as P, is_function as E, is_string as S, is_array as R, Functions as _, combine as d } from "@nagisham/standard";
const F = "listening:";
function N(s) {
  const n = {}, t = (o) => n[o] ?? (n[o] = { listeners: [] });
  function e(o, c) {
    const u = t(o);
    u.listeners.forEach((g) => {
      g(c, u.previous);
    }), u.previous = c;
  }
  function r(o) {
    const { type: c, select: u, each: g, once: p } = o, h = o.equal ?? (s == null ? void 0 : s.equal), I = t(c);
    function i() {
      const { listeners: f } = I, l = f.indexOf(a);
      if (l === -1) {
        console.warn("event engine: registered listener not found");
        return;
      }
      f.splice(l, 1);
    }
    function a(f, l) {
      try {
        if (u && (f && (f = u(f)), l && (l = u(l))), l && (h != null && h(f, l)))
          return;
        g ? g(f) : p ? (p(f), i()) : console.error("event engine: no listener was provided");
      } catch (O) {
        console.error(O);
      }
    }
    return I.listeners.push(a), c.startsWith(F) || e(F + c, a), i;
  }
  return { fire: e, listen: r };
}
function J(s) {
  const n = { current: s, previous: s };
  function t(r) {
    return r ? n.previous : n.current;
  }
  function e(r) {
    n.previous = n.current, n.current = r;
  }
  return { get: t, set: e };
}
const w = j((s) => {
  const { get: n, set: t } = J(s), { fire: e, listen: r } = N();
  r({
    type: "listening:change",
    each: (c) => {
      b(n()) && c(n());
    }
  }), r({
    type: "cleanup",
    each: () => t(void 0)
  });
  function o(c) {
    if (y(c))
      return n();
    const u = n(), g = m(c, u);
    Object.is(u, g) || (t(g), e("change", g));
  }
  return Object.assign(o, { fire: e, listen: r });
});
function T(s) {
  return ({ set: n, listen: t }) => {
    const e = localStorage.getItem(s);
    b(e) && n(JSON.parse(e)), t({
      type: "change",
      each: (r) => {
        localStorage.setItem(s, JSON.stringify(r));
      }
    });
  };
}
function W(s) {
  return ({ set: n, listen: t }) => {
    const e = sessionStorage.getItem(s);
    b(e) && n(JSON.parse(e)), t({
      type: "change",
      each: (r) => {
        sessionStorage.setItem(s, JSON.stringify(r));
      }
    });
  };
}
const q = j(
  (s, n) => {
    const t = J(s), e = N();
    e.listen({
      type: "listening:change",
      each: (c) => {
        b(t.get()) && c(t.get());
      }
    }), e.listen({
      type: "cleanup",
      each: () => t.set(void 0)
    });
    function r() {
      return Object.assign({}, t.get());
    }
    function o(c, u) {
      var g;
      if (y(c) && y(u))
        return r();
      if (P(c) || E(c)) {
        const p = t.get(), h = Object.assign({}, p, m(c, p));
        t.set(h), e.fire("change", h);
      }
      if (S(c) && y(u))
        return (g = t.get()) == null ? void 0 : g[c];
      if (S(c) && b(u)) {
        const p = t.get(), h = Object.assign({}, p, {
          [c]: m(u, p == null ? void 0 : p[c])
        });
        t.set(h), e.fire("change", h);
      }
    }
    return n == null || n.forEach((c) => {
      c({ ...t, ...e });
    }), Object.assign(o, e);
  }
), A = j((s) => {
  const { get: n, set: t } = J(s ?? []), { fire: e, listen: r } = N();
  r({
    type: "listening:change",
    each: (i) => {
      n().length && i(o());
    }
  }), r({
    type: "cleanup",
    each: () => t([])
  });
  function o(i) {
    return n(i).slice();
  }
  function c(i, a) {
    if (y(i) && y(a))
      return o();
    if (R(i) || E(i)) {
      const f = m(i, o());
      t(f), e("change", f);
      return;
    }
    if (b(i)) {
      const f = S(i) ? parseInt(i) : i;
      if (y(a))
        return n()[f];
      const l = n()[f];
      g(f, m(a, l));
    }
  }
  function u(i) {
    return n().findIndex(i);
  }
  function g(i, a) {
    const f = o();
    let l, O;
    y(a) ? (l = f.length, O = i) : (l = i, O = a), f.splice(l, 0, O), t(f), e("insert", { index: l, element: O });
  }
  function p(i) {
    const a = o(), f = a.splice(i, 1)[0];
    return t(a), e("remove", { index: i, element: f }), f;
  }
  function h(i) {
    const a = n();
    if (y(i))
      return a.length;
    if (i === 0) {
      e("cleanup");
      return;
    }
    let f = a.length;
    for (; f > i; )
      f--, p(f);
  }
  function I(i) {
    n().forEach(i);
  }
  return Object.assign(c, {
    find: u,
    insert: g,
    remove: p,
    len: h,
    each: I,
    fire: e,
    listen: r
  });
}), G = (s) => {
  const { listener: n, dependency: t } = s, e = new Array();
  let r;
  const o = {
    type: "change",
    each: () => {
    }
  };
  return t.forEach((c) => {
    o.each = () => {
      E(r) && (r(), r = void 0);
      const u = t.map(_.call);
      u.every(b) && (r = n(...u));
    }, e.push(c.listen(o));
  }), () => e.forEach(_.call);
}, X = (s) => {
  const { listener: n, dependency: t } = s, e = w();
  return G({
    listener: (...r) => {
      e(n(...r));
    },
    dependency: t
  }), e;
};
function z(s, n) {
  const t = {}, e = new Proxy(s(), {
    get: (o, c) => (t.key = c, Reflect.get(o, c))
  }), r = w(n(e));
  return r.listen({
    type: "cleanup",
    once: d(
      s.listen({
        type: "change",
        select: n,
        each: (o) => {
          r(o);
        }
      }),
      r.listen({
        type: "change",
        each: (o) => {
          s(t.key, o);
        }
      })
    )
  }), r;
}
function B(s) {
  return s instanceof w;
}
function C(s) {
  return s instanceof q;
}
function D(s) {
  return s instanceof A;
}
export {
  X as computed,
  G as effect,
  N as event_engine,
  B as is_signal,
  C as is_slice,
  D as is_storage,
  T as local_storage_middleware,
  z as selector,
  W as session_storage_middleware,
  w as signal,
  q as slice,
  J as state_engine,
  A as storage
};
//# sourceMappingURL=main.js.map
