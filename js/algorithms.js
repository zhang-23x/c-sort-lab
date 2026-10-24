/* =========================================================
   SORT/CODE LAB — trace generators + C source
   Pure data / state generation. The UI consumes snapshots.
   ========================================================= */
(function (global) {
  "use strict";

  const DEFAULT_ARRAY = [42, 17, 68, 31, 9, 55, 23, 74, 12, 60, 36, 48];
  const MIN_LENGTH = 3;
  const MAX_LENGTH = 18;
  const MIN_VALUE = 1;
  const MAX_VALUE = 99;

  class Trace {
    constructor(values) {
      this.a = values.slice();
      this.n = this.a.length;
      this.steps = [];
      this.sorted = new Set();
      this.aux = null;
      this.stats = { comparisons: 0, writes: 0, swaps: 0 };
    }

    snapshot(opts) {
      const n = this.n;
      const cleanIndexes = (list) => (list || []).filter((i) => Number.isInteger(i) && i >= 0 && i < n);
      const pointers = (opts.pointers || [])
        .filter((p) => p && Number.isInteger(p.index) && p.index >= 0 && p.index < n)
        .map((p) => ({ label: String(p.label), index: p.index, tone: p.tone || "" }));

      this.steps.push({
        lineKey: opts.lineKey || "entry",
        title: opts.title || "",
        note: opts.note || "",
        why: opts.why || "",
        phase: opts.phase || "RUN",
        array: this.a.slice(),
        aux: this.aux ? this.aux.slice() : null,
        auxWrite: Number.isInteger(opts.auxWrite) ? opts.auxWrite : null,
        compare: cleanIndexes(opts.compare),
        swap: cleanIndexes(opts.swap),
        write: cleanIndexes(opts.write),
        sorted: Array.from(this.sorted).sort((a, b) => a - b),
        range: opts.range ? opts.range.slice() : [0, n - 1],
        pivot: Number.isInteger(opts.pivot) ? opts.pivot : null,
        keyIndex: Number.isInteger(opts.keyIndex) ? opts.keyIndex : null,
        pointers,
        vars: (opts.vars || []).map((v) => ({ name: v.name, value: String(v.value) })),
        stats: { ...this.stats },
        heapSize: Number.isInteger(opts.heapSize) ? opts.heapSize : null,
        done: Boolean(opts.done)
      });
    }

    swap(i, j) {
      const t = this.a[i];
      this.a[i] = this.a[j];
      this.a[j] = t;
      this.stats.swaps += 1;
      this.stats.writes += 2;
    }

    finalize(opts) {
      for (let i = 0; i < this.n; i += 1) this.sorted.add(i);
      this.aux = null;
      this.snapshot({
        lineKey: opts.lineKey || "exit",
        title: opts.title || "排序完成",
        note: opts.note || "数组已经按升序排列。",
        why: opts.why || "排序算法通过有限次比较和写入，把无序数组转换为有序数组。",
        phase: "COMPLETE",
        range: [0, this.n - 1],
        vars: [
          { name: "n", value: this.n },
          { name: "compares", value: this.stats.comparisons },
          { name: "writes", value: this.stats.writes }
        ],
        done: true
      });
      return this.steps;
    }
  }

  function idxText(i) {
    return `a[${i}]`;
  }

  /* ---------------------------------------------------------
     Bubble sort
     --------------------------------------------------------- */
  function buildBubble(values) {
    const t = new Trace(values);
    const n = t.n;

    t.snapshot({
      lineKey: "entry",
      title: "数组已就绪",
      note: `准备处理 ${n} 个元素。冒泡排序会反复比较相邻元素，把较大的值一步步推向右侧。`,
      why: "只比较相邻元素，所以每一轮都只能把一个极值送到它最终应该在的位置。",
      phase: "READY",
      range: [0, n - 1],
      vars: [{ name: "n", value: n }, { name: "pass", value: 0 }]
    });

    for (let end = n - 1; end > 0; end -= 1) {
      let swapped = false;
      const pass = n - end;

      t.snapshot({
        lineKey: "outer",
        title: `开始第 ${pass} 轮扫描`,
        note: `这一轮的未排序区间是 [0..${end}]。右端 ${end} 之后已经就位。`,
        why: "每轮结束后，当前未排序区间的最大值会停在区间最右端。",
        phase: "SCAN",
        range: [0, end],
        pointers: [{ label: "end", index: end, tone: "accent" }],
        vars: [
          { name: "pass", value: pass },
          { name: "end", value: end },
          { name: "swapped", value: 0 }
        ]
      });

      for (let i = 0; i < end; i += 1) {
        const left = t.a[i];
        const right = t.a[i + 1];
        t.stats.comparisons += 1;

        t.snapshot({
          lineKey: "compare",
          title: `比较 ${idxText(i)} 与 ${idxText(i + 1)}`,
          note: `${left} 与 ${right}：${left > right ? "左边更大，逆序出现。" : "顺序正确，不交换。"}`,
          why: "冒泡排序只关心相邻的一对元素，因此一次比较就能决定它们是否需要交换。",
          phase: "COMPARE",
          compare: [i, i + 1],
          range: [0, end],
          pointers: [
            { label: "i", index: i },
            { label: "i+1", index: i + 1, tone: "j" }
          ],
          vars: [
            { name: "i", value: i },
            { name: "a[i]", value: left },
            { name: "a[i+1]", value: right },
            { name: "swapped", value: swapped ? 1 : 0 }
          ]
        });

        if (left > right) {
          t.snapshot({
            lineKey: "swapStart",
            title: "发现逆序，进入交换",
            note: `因为 ${left} > ${right}，交换这两项，让较大的 ${left} 向右移动。`,
            why: "交换需要一个临时变量，否则第一次赋值会把原值覆盖掉。",
            phase: "SWAP",
            swap: [i, i + 1],
            range: [0, end],
            pointers: [
              { label: "i", index: i },
              { label: "i+1", index: i + 1, tone: "j" }
            ],
            vars: [
              { name: "i", value: i },
              { name: "t", value: left }
            ]
          });

          t.swap(i, i + 1);
          swapped = true;

          t.snapshot({
            lineKey: "swapEnd",
            title: "交换完成",
            note: `现在 ${idxText(i)} = ${t.a[i]}，${idxText(i + 1)} = ${t.a[i + 1]}。较大的值向右走了一步。`,
            why: "每次交换都让较大的元素更接近它在本轮中的最终位置。",
            phase: "SWAP",
            swap: [i, i + 1],
            range: [0, end],
            pointers: [
              { label: "i", index: i },
              { label: "i+1", index: i + 1, tone: "j" }
            ],
            vars: [
              { name: "i", value: i },
              { name: "a[i]", value: t.a[i] },
              { name: "a[i+1]", value: t.a[i + 1] }
            ]
          });
        }
      }

      t.sorted.add(end);
      t.snapshot({
        lineKey: "earlyExit",
        title: `第 ${pass} 轮完成，锁定 ${idxText(end)}`,
        note: `${t.a[end]} 已经是当前未排序部分的最大值，固定在索引 ${end}。`,
        why: "这是冒泡排序的不变式：每轮结束后，区间最右端一定是正确值。",
        phase: "LOCK",
        range: [0, end - 1],
        pointers: [{ label: "end", index: end, tone: "accent" }],
        vars: [
          { name: "pass", value: pass },
          { name: "end", value: end },
          { name: "swapped", value: swapped ? 1 : 0 }
        ]
      });

      if (!swapped) {
        t.snapshot({
          lineKey: "earlyExit",
          title: "整轮没有交换，提前结束",
          note: "如果一轮扫描没有发生任何交换，说明所有相邻元素都已有序，数组已经排好。",
          why: "这是冒泡排序的优化：用 swapped 标志跳过所有后续不必要的轮次。",
          phase: "EXIT",
          range: [0, end - 1],
          vars: [{ name: "swapped", value: 0 }, { name: "pass", value: pass }]
        });
        break;
      }
    }

    return t.finalize({
      lineKey: "exit",
      title: "冒泡排序完成",
      note: `数组已升序排列，共进行 ${t.stats.comparisons} 次比较、${t.stats.swaps} 次交换。`,
      why: "冒泡排序稳定、原地，但最坏和平均复杂度都是 O(n²)，更适合教学与小规模数据。"
    });
  }

  /* ---------------------------------------------------------
     Selection sort
     --------------------------------------------------------- */
  function buildSelection(values) {
    const t = new Trace(values);
    const n = t.n;

    t.snapshot({
      lineKey: "entry",
      title: "数组已就绪",
      note: `选择排序会把数组分成「已排序前缀」和「未排序后缀」，每轮从未排序区挑出最小值。`,
      why: "选择排序把「找最小值」和「放置最小值」分开，一轮只交换一次。",
      phase: "READY",
      range: [0, n - 1],
      vars: [{ name: "n", value: n }]
    });

    for (let i = 0; i < n - 1; i += 1) {
      let min = i;

      t.snapshot({
        lineKey: "min",
        title: `第 ${i + 1} 轮：先假设 ${idxText(i)} 最小`,
        note: `在未排序区间 [${i}..${n - 1}] 中寻找最小值，先令 min = ${i}。`,
        why: "选择排序需要记住最小值的索引，而不是最小值的副本，因为最后要交换位置。",
        phase: "SCAN",
        range: [i, n - 1],
        pointers: [
          { label: "i", index: i },
          { label: "min", index: min, tone: "accent" }
        ],
        vars: [
          { name: "i", value: i },
          { name: "min", value: min },
          { name: "minVal", value: t.a[min] }
        ]
      });

      for (let j = i + 1; j < n; j += 1) {
        const candidate = t.a[j];
        const currentMin = t.a[min];
        t.stats.comparisons += 1;

        t.snapshot({
          lineKey: "compare",
          title: `比较 ${idxText(j)} 与当前最小值`,
          note: `${candidate} 和当前最小值 ${currentMin} 比较：${candidate < currentMin ? "找到更小的候选值。" : "没有更小，继续向后扫描。"}`,
          why: "扫描整个未排序区间，确保不会漏掉任何一个更小的元素。",
          phase: "COMPARE",
          compare: [j, min],
          range: [i, n - 1],
          pointers: [
            { label: "i", index: i },
            { label: "j", index: j, tone: "j" },
            { label: "min", index: min, tone: "accent" }
          ],
          vars: [
            { name: "j", value: j },
            { name: "a[j]", value: candidate },
            { name: "min", value: min },
            { name: "minVal", value: currentMin }
          ]
        });

        if (candidate < currentMin) {
          min = j;
          t.snapshot({
            lineKey: "newMin",
            title: "更新最小值索引",
            note: `发现更小的 ${candidate}，把 min 从原来的位置更新到索引 ${j}。`,
            why: "后续只需要继续和这个新的最小值比较，不需要记住旧的最小值。",
            phase: "SCAN",
            compare: [min],
            range: [i, n - 1],
            pointers: [
              { label: "i", index: i },
              { label: "j", index: j, tone: "j" },
              { label: "min", index: min, tone: "accent" }
            ],
            vars: [
              { name: "j", value: j },
              { name: "min", value: min },
              { name: "minVal", value: t.a[min] }
            ]
          });
        }
      }

      t.snapshot({
        lineKey: "afterScan",
        title: "扫描结束，确定最小值",
        note: `未排序区间的最小值是 ${t.a[min]}，位于索引 ${min}。现在把它和索引 ${i} 交换。`,
        why: "此时未排序区里没有比它更小的元素，所以它可以被放到当前有序前缀的末尾。",
        phase: "SCAN",
        range: [i, n - 1],
        pointers: [
          { label: "i", index: i },
          { label: "min", index: min, tone: "accent" }
        ],
        vars: [
          { name: "min", value: min },
          { name: "minVal", value: t.a[min] }
        ]
      });

      if (min !== i) {
        t.snapshot({
          lineKey: "swapStart",
          title: "交换最小值与目标位置",
          note: `交换 ${idxText(i)} 和 ${idxText(min)}。未排序区间的最小值将进入有序前缀。`,
          why: "选择排序每轮最多交换一次，因此写入次数通常少于冒泡排序。",
          phase: "SWAP",
          swap: [i, min],
          range: [i, n - 1],
          pointers: [
            { label: "i", index: i },
            { label: "min", index: min, tone: "accent" }
          ],
          vars: [
            { name: "i", value: i },
            { name: "min", value: min }
          ]
        });

        t.swap(i, min);

        t.snapshot({
          lineKey: "swapEnd",
          title: "交换完成",
          note: `${t.a[i]} 已经到达索引 ${i}。下一轮从索引 ${i + 1} 开始。`,
          why: "交换后，有序前缀增加一个元素，未排序后缀缩小一个元素。",
          phase: "SWAP",
          swap: [i, min],
          range: [i, n - 1],
          pointers: [{ label: "i", index: i }],
          vars: [
            { name: "i", value: i },
            { name: "a[i]", value: t.a[i] }
          ]
        });
      } else {
        t.snapshot({
          lineKey: "afterScan",
          title: "最小值已经在目标位置",
          note: `${t.a[i]} 本来就在索引 ${i}，不需要交换。`,
          why: "min == i 说明当前元素已经落在正确位置，交换条件可以跳过。",
          phase: "LOCK",
          range: [i + 1, n - 1],
          pointers: [{ label: "i", index: i }],
          vars: [{ name: "i", value: i }, { name: "min", value: min }]
        });
      }

      t.sorted.add(i);
      t.snapshot({
        lineKey: "lock",
        title: `索引 ${i} 已就位`,
        note: `${t.a[i]} 加入已排序前缀。接下来只处理索引 [${i + 1}..${n - 1}]。`,
        why: "有序前缀不断增长，最终覆盖整个数组。",
        phase: "LOCK",
        range: [i + 1, n - 1],
        pointers: [{ label: "i", index: i, tone: "accent" }],
        vars: [{ name: "i", value: i }, { name: "sorted", value: `${i + 1} / ${n}` }]
      });
    }

    return t.finalize({
      lineKey: "exit",
      title: "选择排序完成",
      note: `数组已升序排列，共比较 ${t.stats.comparisons} 次，只交换 ${t.stats.swaps} 次。`,
      why: "选择排序交换次数少，但比较次数固定接近 n(n-1)/2，因此仍是 O(n²)。"
    });
  }

  /* ---------------------------------------------------------
     Insertion sort
     --------------------------------------------------------- */
  function buildInsertion(values) {
    const t = new Trace(values);
    const n = t.n;

    t.snapshot({
      lineKey: "entry",
      title: "数组已就绪",
      note: "插入排序维护一个有序前缀，每次取出下一个元素 key，再把比它大的前缀元素依次右移。",
      why: "这很像整理扑克牌：左手已经有序，右手拿着一张新牌，找到位置插进去。",
      phase: "READY",
      range: [0, n - 1],
      vars: [{ name: "n", value: n }]
    });

    for (let i = 1; i < n; i += 1) {
      const key = t.a[i];
      let j = i - 1;

      t.snapshot({
        lineKey: "pick",
        title: `取出 ${idxText(i)} 作为 key`,
        note: `key = ${key}。索引 0 到 ${i - 1} 已经有序，现在要为 key 找到插入位置。`,
        why: "key 先存进局部变量，后面的右移会覆盖 a[i]，但不会丢失待插入的值。",
        phase: "SELECT",
        range: [0, i],
        keyIndex: i,
        pointers: [
          { label: "i", index: i },
          { label: "key", index: i, tone: "key" }
        ],
        vars: [
          { name: "i", value: i },
          { name: "key", value: key },
          { name: "j", value: j }
        ]
      });

      while (j >= 0) {
        const current = t.a[j];
        t.stats.comparisons += 1;

        t.snapshot({
          lineKey: "while",
          title: `比较 ${idxText(j)} 与 key`,
          note: `a[j] = ${current}，key = ${key}。${current > key ? "前缀元素更大，需要给它让位。" : "已经找到插入位置。"}`,
          why: "while 条件同时检查边界 j >= 0 和大小关系 a[j] > key；两个条件都成立才继续左移。",
          phase: "COMPARE",
          compare: [j],
          range: [0, i],
          keyIndex: i,
          pointers: [
            { label: "j", index: j, tone: "j" },
            { label: "key", index: i, tone: "key" }
          ],
          vars: [
            { name: "j", value: j },
            { name: "a[j]", value: current },
            { name: "key", value: key }
          ]
        });

        if (current <= key) break;

        const from = j;
        const to = j + 1;
        t.a[to] = t.a[from];
        t.stats.writes += 1;
        j -= 1;

        t.snapshot({
          lineKey: "shift",
          title: "较大的元素右移一格",
          note: `把 ${idxText(from)} 的 ${t.a[to]} 复制到 ${idxText(to)}，为 key 腾出位置。`,
          why: "右移而不是交换，能减少临时变量；被覆盖的 a[i] 已经安全保存在 key 中。",
          phase: "WRITE",
          write: [to],
          compare: [from],
          range: [0, i],
          keyIndex: i,
          pointers: [
            { label: "j", index: from, tone: "j" },
            { label: "hole", index: to, tone: "key" }
          ],
          vars: [
            { name: "from", value: from },
            { name: "to", value: to },
            { name: "j", value: j },
            { name: "key", value: key }
          ]
        });
      }

      t.a[j + 1] = key;
      t.stats.writes += 1;
      for (let k = 0; k <= i; k += 1) t.sorted.add(k);

      t.snapshot({
        lineKey: "place",
        title: "把 key 放回空位",
        note: `key = ${key} 插入到索引 ${j + 1}。有序前缀扩展为 [0..${i}]。`,
        why: "j 停在最后一个不大于 key 的元素上，所以空位正好是 j + 1。",
        phase: "WRITE",
        write: [j + 1],
        range: [0, i],
        pointers: [{ label: "key", index: j + 1, tone: "key" }],
        vars: [
          { name: "j + 1", value: j + 1 },
          { name: "key", value: key },
          { name: "sorted", value: `${i + 1} / ${n}` }
        ]
      });
    }

    return t.finalize({
      lineKey: "exit",
      title: "插入排序完成",
      note: `数组已升序排列，共比较 ${t.stats.comparisons} 次，写入 ${t.stats.writes} 次。`,
      why: "插入排序对近乎有序的数据非常快，最好情况只需 O(n) 次比较；最坏情况仍是 O(n²)。"
    });
  }

  /* ---------------------------------------------------------
     Shell sort
     --------------------------------------------------------- */
  function buildShell(values) {
    const t = new Trace(values);
    const n = t.n;

    t.snapshot({
      lineKey: "entry",
      title: "数组已就绪",
      note: "希尔排序先按较大的增量 gap 对子序列做插入排序，再逐步缩小 gap，最后 gap = 1。",
      why: "大增量可以快速把元素移动到较远的位置，减少最后阶段的大量逐格移动。",
      phase: "READY",
      range: [0, n - 1],
      vars: [{ name: "n", value: n }, { name: "gap", value: Math.floor(n / 2) }]
    });

    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
      t.snapshot({
        lineKey: "gap",
        title: `当前增量 gap = ${gap}`,
        note: `把数组按间隔 ${gap} 分成若干子序列，每个子序列分别做插入排序。`,
        why: "增量越大，元素可以跨越更远的距离；随着 gap 缩小，数组越来越接近有序。",
        phase: "GAP",
        range: [0, n - 1],
        vars: [
          { name: "gap", value: gap },
          { name: "groups", value: gap }
        ]
      });

      for (let i = gap; i < n; i += 1) {
        const key = t.a[i];
        let j = i;

        t.snapshot({
          lineKey: "pick",
          title: `取出 ${idxText(i)} 作为 key`,
          note: `在间隔为 ${gap} 的子序列里，key = ${key} 需要向前找到合适的位置。`,
          why: "这里的插入排序步长不是 1，而是 gap，因此它作用于一个子序列。",
          phase: "SELECT",
          range: [0, n - 1],
          keyIndex: i,
          pointers: [
            { label: "i", index: i },
            { label: "gap", index: i, tone: "accent" },
            { label: "key", index: i, tone: "key" }
          ],
          vars: [
            { name: "gap", value: gap },
            { name: "i", value: i },
            { name: "key", value: key }
          ]
        });

        while (j >= gap) {
          const current = t.a[j - gap];
          t.stats.comparisons += 1;

          t.snapshot({
            lineKey: "while",
            title: `比较 ${idxText(j - gap)} 与 key`,
            note: `a[${j - gap}] = ${current}，key = ${key}。${current > key ? "更大的元素需要后移 gap 格。" : "位置合适，停止移动。"}`,
            why: "比较对象不是相邻元素，而是相隔 gap 个位置的元素；这是希尔排序与插入排序的关键区别。",
            phase: "COMPARE",
            compare: [j - gap],
            range: [0, n - 1],
            keyIndex: i,
            pointers: [
              { label: "j-gap", index: j - gap, tone: "j" },
              { label: "j", index: j },
              { label: "key", index: i, tone: "key" }
            ],
            vars: [
              { name: "gap", value: gap },
              { name: "j", value: j },
              { name: "a[j-gap]", value: current },
              { name: "key", value: key }
            ]
          });

          if (current <= key) break;

          const from = j - gap;
          const to = j;
          t.a[to] = t.a[from];
          t.stats.writes += 1;
          j -= gap;

          t.snapshot({
            lineKey: "shift",
            title: `跨 ${gap} 格右移`,
            note: `把 ${idxText(from)} 的 ${t.a[to]} 复制到 ${idxText(to)}，空位向左移动 ${gap} 格。`,
            why: "大步移动让元素快速接近目标位置；最终 gap = 1 时只差最后的小修正。",
            phase: "WRITE",
            write: [to],
            compare: [from],
            range: [0, n - 1],
            keyIndex: i,
            pointers: [
              { label: "from", index: from, tone: "j" },
              { label: "to", index: to, tone: "key" }
            ],
            vars: [
              { name: "gap", value: gap },
              { name: "from", value: from },
              { name: "to", value: to },
              { name: "j", value: j }
            ]
          });
        }

        t.a[j] = key;
        t.stats.writes += 1;

        t.snapshot({
          lineKey: "place",
          title: "把 key 放入子序列空位",
          note: `key = ${key} 插入到索引 ${j}。这个以 ${gap} 为间隔的子序列现在是有序的。`,
          why: "外层循环结束后，所有间隔为 gap 的子序列都各自有序；当 gap = 1 时整个数组有序。",
          phase: "WRITE",
          write: [j],
          range: [0, n - 1],
          pointers: [{ label: "key", index: j, tone: "key" }],
          vars: [
            { name: "gap", value: gap },
            { name: "j", value: j },
            { name: "key", value: key }
          ]
        });
      }
    }

    return t.finalize({
      lineKey: "exit",
      title: "希尔排序完成",
      note: `数组已升序排列，共比较 ${t.stats.comparisons} 次，写入 ${t.stats.writes} 次。`,
      why: "希尔排序的性能取决于增量序列。这里使用 n/2 折半序列，简单但不是最优。"
    });
  }

  /* ---------------------------------------------------------
     Merge sort
     --------------------------------------------------------- */
  function buildMerge(values) {
    const t = new Trace(values);
    const n = t.n;
    let mergeCount = 0;

    t.snapshot({
      lineKey: "entry",
      title: "数组已就绪",
      note: "归并排序会把数组不断对半拆分，直到每个区间只有一个元素，再两两合并成有序区间。",
      why: "拆分本身不排序；真正的排序工作发生在 merge 阶段：把两个有序区间线性合并。",
      phase: "READY",
      range: [0, n - 1],
      vars: [{ name: "n", value: n }, { name: "depth", value: 0 }]
    });

    function merge(lo, mid, hi, depth) {
      mergeCount += 1;
      t.aux = new Array(n).fill(null);

      t.snapshot({
        lineKey: "mergeEntry",
        title: `合并区间 [${lo}..${mid}] + [${mid + 1}..${hi}]`,
        note: `两个子区间已经是升序的。使用 i、j 分别读取左右两侧，把较小值写入临时数组 tmp。`,
        why: "合并阶段不会改变原数组，直到临时数组填满后，才一次性写回原数组。",
        phase: "MERGE",
        range: [lo, hi],
        pointers: [
          { label: "lo", index: lo, tone: "accent" },
          { label: "mid", index: mid },
          { label: "hi", index: hi }
        ],
        vars: [
          { name: "lo", value: lo },
          { name: "mid", value: mid },
          { name: "hi", value: hi },
          { name: "depth", value: depth }
        ]
      });

      let i = lo;
      let j = mid + 1;
      let k = lo;

      while (i <= mid && j <= hi) {
        const left = t.a[i];
        const right = t.a[j];
        t.stats.comparisons += 1;

        t.snapshot({
          lineKey: "compare",
          title: `比较左右两段的队首`,
          note: `${left} 和 ${right} 比较：${left <= right ? "左边更小或相等，先取左边。" : "右边更小，先取右边。"}`,
          why: "只看两个队首就够了，因为左右两段各自已经有序。",
          phase: "COMPARE",
          compare: [i, j],
          range: [lo, hi],
          pointers: [
            { label: "i", index: i },
            { label: "j", index: j, tone: "j" },
            { label: "k", index: k, tone: "accent" }
          ],
          vars: [
            { name: "i", value: i },
            { name: "j", value: j },
            { name: "left", value: left },
            { name: "right", value: right }
          ]
        });

        if (left <= right) {
          t.aux[k] = left;
          t.stats.writes += 1;
          t.snapshot({
            lineKey: "takeLeft",
            title: "把左侧队首写入 tmp",
            note: `tmp[${k}] = ${left}。左侧指针 i 向右移动一。`,
            why: "<= 保证相等元素先取左边，因此归并排序是稳定排序。",
            phase: "WRITE",
            auxWrite: k,
            compare: [i, j],
            range: [lo, hi],
            pointers: [
              { label: "i", index: i },
              { label: "j", index: j, tone: "j" },
              { label: "k", index: k, tone: "accent" }
            ],
            vars: [
              { name: "i", value: i },
              { name: "j", value: j },
              { name: "k", value: k },
              { name: "write", value: left }
            ]
          });
          i += 1;
        } else {
          t.aux[k] = right;
          t.stats.writes += 1;
          t.snapshot({
            lineKey: "takeRight",
            title: "把右侧队首写入 tmp",
            note: `tmp[${k}] = ${right}。右侧指针 j 向右移动一。`,
            why: "右侧队首更小，所以让右侧的元素优先进入合并结果。",
            phase: "WRITE",
            auxWrite: k,
            compare: [i, j],
            range: [lo, hi],
            pointers: [
              { label: "i", index: i },
              { label: "j", index: j, tone: "j" },
              { label: "k", index: k, tone: "accent" }
            ],
            vars: [
              { name: "i", value: i },
              { name: "j", value: j },
              { name: "k", value: k },
              { name: "write", value: right }
            ]
          });
          j += 1;
        }
        k += 1;
      }

      while (i <= mid) {
        t.aux[k] = t.a[i];
        t.stats.writes += 1;
        t.snapshot({
          lineKey: "drainLeft",
          title: "右侧已取完，左段剩余项直接填入",
          note: `tmp[${k}] = ${t.a[i]}。此时右段为空，左段剩余元素本来就是有序的。`,
          why: "不像继续比较，剩下的一段可以直接复制，因为内部已经升序。",
          phase: "WRITE",
          auxWrite: k,
          range: [lo, hi],
          pointers: [
            { label: "i", index: i },
            { label: "k", index: k, tone: "accent" }
          ],
          vars: [
            { name: "i", value: i },
            { name: "k", value: k },
            { name: "write", value: t.a[i] }
          ]
        });
        i += 1;
        k += 1;
      }

      while (j <= hi) {
        t.aux[k] = t.a[j];
        t.stats.writes += 1;
        t.snapshot({
          lineKey: "drainRight",
          title: "左侧已取完，右段剩余项直接填入",
          note: `tmp[${k}] = ${t.a[j]}。右段剩余部分已经有序，可以整体接在 tmp 后面。`,
          why: "归并排序的线性时间来自这里：每个元素只在合并时被处理一次。",
          phase: "WRITE",
          auxWrite: k,
          range: [lo, hi],
          pointers: [
            { label: "j", index: j, tone: "j" },
            { label: "k", index: k, tone: "accent" }
          ],
          vars: [
            { name: "j", value: j },
            { name: "k", value: k },
            { name: "write", value: t.a[j] }
          ]
        });
        j += 1;
        k += 1;
      }

      for (let write = lo; write <= hi; write += 1) {
        t.a[write] = t.aux[write];
        t.stats.writes += 1;
        t.snapshot({
          lineKey: "copyBack",
          title: `把 tmp[${write}] 写回原数组`,
          note: `a[${write}] = ${t.a[write]}。临时结果开始覆盖原数组。`,
          why: "copyBack 是原地排序变体的代价：需要 O(n) 的辅助空间，但排序本身稳定。",
          phase: "WRITE",
          write: [write],
          range: [lo, hi],
          pointers: [{ label: "k", index: write, tone: "accent" }],
          vars: [
            { name: "write", value: write },
            { name: "value", value: t.a[write] },
            { name: "range", value: `[${lo}..${hi}]` }
          ]
        });
      }

      t.snapshot({
        lineKey: "merged",
        title: `区间 [${lo}..${hi}] 已合并`,
        note: `这个区间现在是升序的，长度为 ${hi - lo + 1}。递归回到上一层继续合并。`,
        why: "合并后的区间成为上一层递归的「有序输入」，最终覆盖整个数组。",
        phase: "MERGE",
        range: [lo, hi],
        pointers: [
          { label: "lo", index: lo, tone: "accent" },
          { label: "hi", index: hi }
        ],
        vars: [
          { name: "merged", value: `[${lo}..${hi}]` },
          { name: "merges", value: mergeCount }
        ]
      });
    }

    function mergeSort(lo, hi, depth) {
      if (lo >= hi) {
        if (lo === hi) {
          t.snapshot({
            lineKey: "base",
            title: "单元素区间天然有序",
            note: `区间 [${lo}..${hi}] 只有一个元素 ${t.a[lo]}，不需要继续拆分，准备回溯。`,
            why: "递归的终止条件：长度不足 2 的区间必定有序。",
            phase: "BASE",
            range: [lo, hi],
            pointers: [{ label: "lo", index: lo, tone: "accent" }],
            vars: [{ name: "depth", value: depth }, { name: "length", value: 1 }]
          });
        }
        return;
      }

      const mid = lo + Math.floor((hi - lo) / 2);
      t.snapshot({
        lineKey: "split",
        title: `拆分 [${lo}..${hi}]`,
        note: `mid = ${mid}。左半区 [${lo}..${mid}]，右半区 [${mid + 1}..${hi}]，先递归处理左半区。`,
        why: "归并排序采用分治：先让左右两半各自有序，再合并两个有序区间。",
        phase: "SPLIT",
        range: [lo, hi],
        pointers: [
          { label: "lo", index: lo, tone: "accent" },
          { label: "mid", index: mid },
          { label: "hi", index: hi }
        ],
        vars: [
          { name: "lo", value: lo },
          { name: "mid", value: mid },
          { name: "hi", value: hi },
          { name: "depth", value: depth }
        ]
      });

      mergeSort(lo, mid, depth + 1);
      mergeSort(mid + 1, hi, depth + 1);
      merge(lo, mid, hi, depth);
    }

    mergeSort(0, n - 1, 0);

    return t.finalize({
      lineKey: "exit",
      title: "归并排序完成",
      note: `数组已升序排列，共比较 ${t.stats.comparisons} 次，写入 ${t.stats.writes} 次，完成 ${mergeCount} 次合并。`,
      why: "归并排序稳定，时间复杂度稳定在 O(n log n)，代价是需要 O(n) 的临时数组。"
    });
  }

  /* ---------------------------------------------------------
     Quick sort (Lomuto partition)
     --------------------------------------------------------- */
  function buildQuick(values) {
    const t = new Trace(values);
    const n = t.n;

    t.snapshot({
      lineKey: "entry",
      title: "数组已就绪",
      note: "快速排序选择一个基准 pivot，把小于它的元素放到左边，再递归排序左右两个分区。",
      why: "partition 之后，pivot 已经在最终位置，后续递归不需要再处理它。",
      phase: "READY",
      range: [0, n - 1],
      vars: [{ name: "n", value: n }, { name: "pivot rule", value: "a[hi]" }]
    });

    function partition(lo, hi, depth) {
      const pivotValue = t.a[hi];
      t.snapshot({
        lineKey: "pivot",
        title: `选择末位 ${idxText(hi)} 作为基准`,
        note: `pivot = ${pivotValue}。目标：让所有小于 ${pivotValue} 的值都在它左边。`,
        why: "Lomuto 分区固定选择区间末位作为 pivot，代码简单，适合学习分区过程。",
        phase: "PIVOT",
        range: [lo, hi],
        pivot: hi,
        pointers: [
          { label: "lo", index: lo, tone: "accent" },
          { label: "pivot", index: hi, tone: "pivot" }
        ],
        vars: [
          { name: "lo", value: lo },
          { name: "hi", value: hi },
          { name: "pivot", value: pivotValue },
          { name: "depth", value: depth }
        ]
      });

      let i = lo;
      for (let j = lo; j < hi; j += 1) {
        const value = t.a[j];
        t.stats.comparisons += 1;
        t.snapshot({
          lineKey: "compare",
          title: `比较 ${idxText(j)} 与 pivot`,
          note: `a[j] = ${value}，pivot = ${pivotValue}。${value < pivotValue ? "小于基准，应该进入左分区。" : "不小于基准，暂时留在右侧。"}`,
          why: "i 是左分区的边界；j 扫描整个区间，把小于 pivot 的值逐个收集到左边。",
          phase: "COMPARE",
          compare: [j],
          range: [lo, hi],
          pivot: hi,
          pointers: [
            { label: "i", index: i, tone: "accent" },
            { label: "j", index: j, tone: "j" },
            { label: "pivot", index: hi, tone: "pivot" }
          ],
          vars: [
            { name: "i", value: i },
            { name: "j", value: j },
            { name: "a[j]", value: value },
            { name: "pivot", value: pivotValue }
          ]
        });

        if (value < pivotValue) {
          if (i !== j) {
            t.snapshot({
              lineKey: "swapStart",
              title: "把较小值换到左分区",
              note: `a[${j}] = ${value} 小于 pivot，交换 ${idxText(i)} 与 ${idxText(j)}，把较小值放进左分区。`,
              why: "左分区只接收小于 pivot 的元素；交换后，i 之前的元素都满足这个条件。",
              phase: "SWAP",
              swap: [i, j],
              range: [lo, hi],
              pivot: hi,
              pointers: [
                { label: "i", index: i, tone: "accent" },
                { label: "j", index: j, tone: "j" },
                { label: "pivot", index: hi, tone: "pivot" }
              ],
              vars: [
                { name: "i", value: i },
                { name: "j", value: j },
                { name: "pivot", value: pivotValue }
              ]
            });

            t.swap(i, j);

            t.snapshot({
              lineKey: "swapEnd",
              title: "左分区扩展一格",
              note: `交换完成，i 向右移动到 ${i + 1}。左分区的元素仍然全部小于 pivot。`,
              why: "i 每次只在遇到小于 pivot 的元素时前进，因此它标记的是左分区的右边界。",
              phase: "SWAP",
              swap: [i, j],
              range: [lo, hi],
              pivot: hi,
              pointers: [
                { label: "i", index: i + 1, tone: "accent" },
                { label: "j", index: j, tone: "j" },
                { label: "pivot", index: hi, tone: "pivot" }
              ],
              vars: [
                { name: "i", value: i + 1 },
                { name: "j", value: j },
                { name: "pivot", value: pivotValue }
              ]
            });
          }
          i += 1;
        }
      }

      if (i !== hi) {
        t.snapshot({
          lineKey: "placeStart",
          title: "把基准换到分界点",
          note: `i 停在 ${i}。交换 ${idxText(i)} 和 ${idxText(hi)}，让 pivot 左侧全部更小，右侧全部不小于它。`,
          why: "此时 a[lo..i-1] 都小于 pivot，而 a[i..hi-1] 都不小于 pivot，pivot 正好属于 i。",
          phase: "PIVOT",
          swap: [i, hi],
          range: [lo, hi],
          pivot: hi,
          pointers: [
            { label: "i", index: i, tone: "accent" },
            { label: "pivot", index: hi, tone: "pivot" }
          ],
          vars: [
            { name: "i", value: i },
            { name: "hi", value: hi },
            { name: "pivot", value: pivotValue }
          ]
        });

        t.swap(i, hi);

        t.snapshot({
          lineKey: "placeEnd",
          title: "基准归位",
          note: `${pivotValue} 现在位于索引 ${i}，左区全部更小，右区全部不小于它。`,
          why: "pivot 已经处于最终排序位置，递归可以放心地排除它。",
          phase: "LOCK",
          swap: [i, hi],
          range: [lo, hi],
          pivot: i,
          pointers: [{ label: "pivot", index: i, tone: "pivot" }],
          vars: [
            { name: "pivotIndex", value: i },
            { name: "pivot", value: pivotValue }
          ]
        });
      } else {
        t.snapshot({
          lineKey: "placeEnd",
          title: "基准已经在分界点",
          note: `i 和 hi 相同，pivot 本来就在索引 ${hi}。左区全部更小，不必交换。`,
          why: "所有扫描值都小于 pivot 时，pivot 已经在最右侧的正确位置。",
          phase: "LOCK",
          range: [lo, hi],
          pivot: i,
          pointers: [{ label: "pivot", index: i, tone: "pivot" }],
          vars: [{ name: "pivotIndex", value: i }]
        });
      }

      t.sorted.add(i);
      t.snapshot({
        lineKey: "recurse",
        title: `分区完成，pivot 位于 ${i}`,
        note: `左区 [${lo}..${i - 1}] 与右区 [${i + 1}..${hi}] 需要分别递归排序。`,
        why: "快速排序的分治发生在分区之后；pivot 不再参与递归。",
        phase: "LOCK",
        range: [lo, hi],
        pivot: i,
        pointers: [
          { label: "left", index: lo, tone: "accent" },
          { label: "pivot", index: i, tone: "pivot" },
          { label: "right", index: hi }
        ],
        vars: [
          { name: "pivotIndex", value: i },
          { name: "left size", value: Math.max(0, i - lo) },
          { name: "right size", value: Math.max(0, hi - i) }
        ]
      });

      return i;
    }

    function quickSort(lo, hi, depth) {
      if (lo > hi) return;

      if (lo === hi) {
        t.sorted.add(lo);
        t.snapshot({
          lineKey: "base",
          title: "单元素区间天然有序",
          note: `区间 [${lo}..${hi}] 只有一个元素，已经有序。`,
          why: "递归终止条件；长度为 0 或 1 的区间不需要 partition。",
          phase: "BASE",
          range: [lo, hi],
          pointers: [{ label: "lo", index: lo, tone: "accent" }],
          vars: [{ name: "depth", value: depth }]
        });
        return;
      }

      const p = partition(lo, hi, depth);
      t.snapshot({
        lineKey: "recurse",
        title: "递归处理左右分区",
        note: `pivot 固定在 ${p}。先处理左区 [${lo}..${p - 1}]，再处理右区 [${p + 1}..${hi}]。`,
        why: "每个 partition 都会永久固定一个 pivot，因此递归总规模不断减小。",
        phase: "SPLIT",
        range: [lo, hi],
        pivot: p,
        pointers: [
          { label: "lo", index: lo, tone: "accent" },
          { label: "p", index: p, tone: "pivot" },
          { label: "hi", index: hi }
        ],
        vars: [
          { name: "depth", value: depth },
          { name: "p", value: p },
          { name: "left", value: `[${lo}..${p - 1}]` },
          { name: "right", value: `[${p + 1}..${hi}]` }
        ]
      });

      quickSort(lo, p - 1, depth + 1);
      quickSort(p + 1, hi, depth + 1);
    }

    quickSort(0, n - 1, 0);

    return t.finalize({
      lineKey: "exit",
      title: "快速排序完成",
      note: `数组已升序排列，共比较 ${t.stats.comparisons} 次，交换 ${t.stats.swaps} 次。`,
      why: "快速排序平均 O(n log n)，但固定末位 pivot 时，遇到已排序数组会退化为 O(n²)。"
    });
  }

  /* ---------------------------------------------------------
     Heap sort
     --------------------------------------------------------- */
  function buildHeap(values) {
    const t = new Trace(values);
    const n = t.n;

    t.snapshot({
      lineKey: "entry",
      title: "数组已就绪",
      note: "堆排序先把数组整理成最大堆：父节点不小于子节点；然后不断把堆顶最大值换到末尾。",
      why: "堆用数组存储，索引 i 的左孩子是 2i+1，右孩子是 2i+2。无需额外指针。",
      phase: "READY",
      range: [0, n - 1],
      heapSize: n,
      vars: [{ name: "n", value: n }, { name: "heapSize", value: n }]
    });

    function siftDown(size, i, depth, phaseName) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let largest = i;

      t.snapshot({
        lineKey: "heapifyEntry",
        title: `检查节点 ${i} 是否满足最大堆`,
        note: `比较父节点 ${idxText(i)} 与孩子${left < size ? ` ${left}` : ""}${right < size ? `、${right}` : ""}。`,
        why: "下沉只沿一条路径进行：如果父节点不是最大，就与最大的孩子交换，继续向下检查。",
        phase: "HEAPIFY",
        range: [0, size - 1],
        heapSize: size,
        pointers: [
          { label: "i", index: i, tone: "accent" },
          ...(left < size ? [{ label: "L", index: left }] : []),
          ...(right < size ? [{ label: "R", index: right }] : [])
        ],
        vars: [
          { name: "i", value: i },
          { name: "left", value: left },
          { name: "right", value: right },
          { name: "heapSize", value: size }
        ]
      });

      if (left < size) {
        const lv = t.a[left];
        const av = t.a[largest];
        t.stats.comparisons += 1;
        t.snapshot({
          lineKey: "compareLeft",
          title: `比较左孩子 ${idxText(left)}`,
          note: `a[${left}] = ${lv}，当前最大候选是 a[${largest}] = ${av}。${lv > av ? "左孩子更大。" : "父节点仍较大。"}`,
          why: "两个 if 是顺序比较：先看左孩子，再用右孩子和当前最大候选比较。",
          phase: "COMPARE",
          compare: [left, largest],
          range: [0, size - 1],
          heapSize: size,
          pointers: [
            { label: "i", index: i, tone: "accent" },
            { label: "L", index: left },
            { label: "max", index: largest }
          ],
          vars: [
            { name: "left", value: left },
            { name: "a[L]", value: lv },
            { name: "largest", value: largest },
            { name: "a[max]", value: av }
          ]
        });
        if (lv > av) largest = left;
      }

      if (right < size) {
        const rv = t.a[right];
        const av = t.a[largest];
        t.stats.comparisons += 1;
        t.snapshot({
          lineKey: "compareRight",
          title: `比较右孩子 ${idxText(right)}`,
          note: `a[${right}] = ${rv}，当前最大候选是 a[${largest}] = ${av}。${rv > av ? "右孩子更大。" : "当前候选仍较大。"}`,
          why: "largest 可能已经被左孩子更新，所以右孩子要和当前候选比较。",
          phase: "COMPARE",
          compare: [right, largest],
          range: [0, size - 1],
          heapSize: size,
          pointers: [
            { label: "i", index: i, tone: "accent" },
            { label: "R", index: right },
            { label: "max", index: largest }
          ],
          vars: [
            { name: "right", value: right },
            { name: "a[R]", value: rv },
            { name: "largest", value: largest },
            { name: "a[max]", value: av }
          ]
        });
        if (rv > av) largest = right;
      }

      if (largest !== i) {
        t.snapshot({
          lineKey: "swapStart",
          title: "父节点不是最大值，交换下沉",
          note: `最大孩子是 ${idxText(largest)}，与父节点 ${idxText(i)} 交换，让较大的值上升到父节点。`,
          why: "交换后，原来的父节点可能仍然不满足堆性质，所以需要继续向 largest 的旧位置递归下沉。",
          phase: "SWAP",
          swap: [i, largest],
          range: [0, size - 1],
          heapSize: size,
          pointers: [
            { label: "i", index: i, tone: "accent" },
            { label: "max", index: largest }
          ],
          vars: [
            { name: "i", value: i },
            { name: "largest", value: largest }
          ]
        });

        t.swap(i, largest);

        t.snapshot({
          lineKey: "swapEnd",
          title: "交换完成，继续下沉",
          note: `${t.a[i]} 现在位于父节点。继续检查索引 ${largest} 的子树。`,
          why: "堆调整必须是递归/迭代的，直到某个节点已经大于等于它的两个孩子。",
          phase: "SWAP",
          swap: [i, largest],
          range: [0, size - 1],
          heapSize: size,
          pointers: [
            { label: "i", index: i, tone: "accent" },
            { label: "next", index: largest }
          ],
          vars: [
            { name: "i", value: i },
            { name: "largest", value: largest },
            { name: "a[i]", value: t.a[i] }
          ]
        });

        siftDown(size, largest, depth + 1, phaseName);
      } else {
        t.snapshot({
          lineKey: "settle",
          title: "当前节点已经是最大值",
          note: `a[${i}] 已经不小于它的孩子，沿着这条路径的堆调整结束。`,
          why: "当 largest == i，说明父节点已经是三者中最大的，不需要继续下沉。",
          phase: "HEAPIFY",
          range: [0, size - 1],
          heapSize: size,
          pointers: [{ label: "i", index: i, tone: "accent" }],
          vars: [
            { name: "i", value: i },
            { name: "largest", value: largest },
            { name: "depth", value: depth }
          ]
        });
      }

      if (phaseName === "build" && i === 0) {
        t.snapshot({
          lineKey: "extract",
          title: "最大堆构建完成",
          note: "堆顶 a[0] 现在是整个数组的最大值。接下来不断取出堆顶，放到未排序区的末尾。",
          why: "建堆从最后一个非叶节点向前下沉，时间复杂度是 O(n)，比逐个插入更高效。",
          phase: "HEAPIFY",
          range: [0, n - 1],
          heapSize: n,
          pointers: [{ label: "root", index: 0, tone: "accent" }],
          vars: [{ name: "heapSize", value: n }, { name: "root", value: t.a[0] }]
        });
      }
    }

    const firstParent = Math.floor(n / 2) - 1;
    for (let i = firstParent; i >= 0; i -= 1) {
      t.snapshot({
        lineKey: "build",
        title: `建堆：下沉节点 ${i}`,
        note: `从最后一个非叶节点 ${firstParent} 开始向前，依次让每个子树满足最大堆性质。`,
        why: "叶子节点（索引 >= n/2）没有孩子，天然满足堆条件，所以无需处理。",
        phase: "HEAPIFY",
        range: [0, n - 1],
        heapSize: n,
        pointers: [{ label: "i", index: i, tone: "accent" }],
        vars: [
          { name: "i", value: i },
          { name: "n / 2 - 1", value: firstParent },
          { name: "heapSize", value: n }
        ]
      });
      siftDown(n, i, 0, "build");
    }

    for (let end = n - 1; end > 0; end -= 1) {
      t.snapshot({
        lineKey: "extract",
        title: `把堆顶换到索引 ${end}`,
        note: `当前堆顶 ${t.a[0]} 是最大值。交换 a[0] 与 a[${end}]，把它锁定在未排序区末尾。`,
        why: "最大堆保证堆顶最大，因此每次取堆顶就能直接得到当前最大值。",
        phase: "HEAPIFY",
        range: [0, end],
        heapSize: end + 1,
        pointers: [
          { label: "root", index: 0, tone: "accent" },
          { label: "end", index: end }
        ],
        vars: [
          { name: "end", value: end },
          { name: "root", value: t.a[0] }
        ]
      });

      t.swap(0, end);
      t.sorted.add(end);

      t.snapshot({
        lineKey: "extractDone",
        title: `最大值 ${t.a[end]} 已归位`,
        note: `索引 ${end} 现在锁定为已排序。堆的有效大小缩小为 ${end}，继续调整新的堆顶。`,
        why: "已排序后缀不再参与堆调整；堆大小每次减少 1。",
        phase: "LOCK",
        range: [0, end - 1],
        heapSize: end,
        pointers: [
          { label: "sorted", index: end, tone: "accent" },
          { label: "root", index: 0 }
        ],
        vars: [
          { name: "end", value: end },
          { name: "heapSize", value: end },
          { name: "a[end]", value: t.a[end] }
        ]
      });

      siftDown(end, 0, 0, "extract");
    }

    t.sorted.add(0);

    return t.finalize({
      lineKey: "exit",
      title: "堆排序完成",
      note: `数组已升序排列，共比较 ${t.stats.comparisons} 次，交换 ${t.stats.swaps} 次。`,
      why: "堆排序稳定在 O(n log n) 且原地排序；但它不是稳定排序，且访问模式对缓存不够友好。"
    });
  }

  /* ---------------------------------------------------------
     Algorithm metadata
     --------------------------------------------------------- */

  const algorithms = [
    {
      id: "bubble",
      name: "冒泡排序",
      en: "BUBBLE SORT",
      file: "bubble_sort.c",
      summary: "反复比较相邻元素，把逆序对逐个交换；每一轮都把一个最大值推到右侧。",
      complexity: { best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)" },
      stable: "稳定",
      inPlace: "原地",
      tags: ["相邻比较", "交换", "可提前结束"],
      mental: {
        title: "用相邻交换，把最大值推出来",
        invariant: "每一轮扫描结束后，未排序区间的最大值一定固定在区间最右端。",
        takeaways: [
          "只比较相邻元素；发生交换说明存在逆序对。",
          "如果整轮没有交换，数组已经有序，可以提前结束。",
          "稳定，但平均和最坏都是 O(n²)。"
        ]
      },
      codeTips: [
        { title: "边界要留一位", text: "内层条件是 i < end，保证读取 a[i+1] 不会越界。" },
        { title: "交换需要临时变量", text: "先保存 a[i]，再覆盖 a[i]，最后把临时值写回 a[i+1]。" },
        { title: "swapped 是优化", text: "它不影响正确性，只用于检测已经有序的输入。" }
      ],
      stepsWhy: "相邻比较是本算法的全部信息来源。",
      code: [
        { t: "void bubble_sort(int a[], int n) {", anchor: "entry" },
        { t: "    /* 每轮把当前最大值推到右侧 */" },
        { t: "    for (int end = n - 1; end > 0; end--) {", anchor: "outer" },
        { t: "        int swapped = 0;", anchor: "flagInit" },
        { t: "        for (int i = 0; i < end; i++) {", anchor: "inner" },
        { t: "            if (a[i] > a[i + 1]) {", anchor: "compare" },
        { t: "                int t = a[i];", anchor: "swapStart" },
        { t: "                a[i] = a[i + 1];", anchor: "swapMid" },
        { t: "                a[i + 1] = t;", anchor: "swapEnd" },
        { t: "                swapped = 1;", anchor: "flag" },
        { t: "            }" },
        { t: "        }" },
        { t: "        if (!swapped) break;", anchor: "earlyExit" },
        { t: "    }" },
        { t: "}", anchor: "exit" }
      ],
      build: buildBubble
    },
    {
      id: "selection",
      name: "选择排序",
      en: "SELECTION SORT",
      file: "selection_sort.c",
      summary: "每轮从未排序区选出最小值，放到有序前缀的末尾；比较多，交换少。",
      complexity: { best: "O(n²)", average: "O(n²)", worst: "O(n²)", space: "O(1)" },
      stable: "不稳定",
      inPlace: "原地",
      tags: ["找最小值", "一轮一次交换", "前缀有序"],
      mental: {
        title: "先找最小值，再决定交换",
        invariant: "索引 0..i-1 是已排序前缀，并且它们都不大于未排序后缀中的任何元素。",
        takeaways: [
          "每轮扫描整个未排序区，比较次数固定。",
          "交换次数最多 n-1 次，适合写入成本高的场景。",
          "不稳定：远处的相等元素可能在交换时改变相对顺序。"
        ]
      },
      codeTips: [
        { title: "min 保存索引", text: "交换需要位置，因此保存最小值所在的下标，而不是只保存值。" },
        { title: "j 从 i+1 开始", text: "当前元素已经默认是最小候选，不需要和自己比较。" },
        { title: "min != i 才交换", text: "跳过无意义的自交换，写入次数更少。" }
      ],
      stepsWhy: "选择排序先把选择做完，再执行一次交换。",
      code: [
        { t: "void selection_sort(int a[], int n) {", anchor: "entry" },
        { t: "    for (int i = 0; i < n - 1; i++) {", anchor: "outer" },
        { t: "        int min = i;", anchor: "min" },
        { t: "        for (int j = i + 1; j < n; j++) {", anchor: "inner" },
        { t: "            if (a[j] < a[min]) {", anchor: "compare" },
        { t: "                min = j;", anchor: "newMin" },
        { t: "            }" },
        { t: "        }" },
        { t: "        if (min != i) {", anchor: "afterScan" },
        { t: "            int t = a[i];", anchor: "swapStart" },
        { t: "            a[i] = a[min];", anchor: "swapMid" },
        { t: "            a[min] = t;", anchor: "swapEnd" },
        { t: "        }" },
        { t: "        /* 有序前缀增加一位 */", anchor: "lock" },
        { t: "    }" },
        { t: "}", anchor: "exit" }
      ],
      build: buildSelection
    },
    {
      id: "insertion",
      name: "插入排序",
      en: "INSERTION SORT",
      file: "insertion_sort.c",
      summary: "维护一个有序前缀，把新元素 key 插入正确位置；对近乎有序的数据非常高效。",
      complexity: { best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)" },
      stable: "稳定",
      inPlace: "原地",
      tags: ["有序前缀", "移动而非交换", "近乎有序快"],
      mental: {
        title: "像整理扑克牌一样插入",
        invariant: "在处理 a[i] 之前，前缀 a[0..i-1] 已经升序；把 key 插入后，前缀扩展到 a[0..i]。",
        takeaways: [
          "比较从右向左进行，遇到不大于 key 的元素就停止。",
          "用右移代替交换，代码里只有一次 key 的写回。",
          "对近乎有序数据几乎线性；非常适合作为混合排序的小数组部分。"
        ]
      },
      codeTips: [
        { title: "key 必须先保存", text: "右移会覆盖 a[i]，所以待插入值必须提前存入局部变量。" },
        { title: "while 的双条件", text: "j >= 0 保证边界安全，a[j] > key 决定是否继续左移。" },
        { title: "插入位置是 j+1", text: "循环停止时，j 指向不大于 key 的元素，空位就在它右边。" }
      ],
      stepsWhy: "key 是一个被暂存的待插入元素，数组的其它部分向右让位。",
      code: [
        { t: "void insertion_sort(int a[], int n) {", anchor: "entry" },
        { t: "    for (int i = 1; i < n; i++) {", anchor: "pick" },
        { t: "        int key = a[i];", anchor: "keyInit" },
        { t: "        int j = i - 1;", anchor: "jInit" },
        { t: "        while (j >= 0 && a[j] > key) {", anchor: "while" },
        { t: "            a[j + 1] = a[j];", anchor: "shift" },
        { t: "            j--;", anchor: "decrement" },
        { t: "        }" },
        { t: "        a[j + 1] = key;", anchor: "place" },
        { t: "    }" },
        { t: "}", anchor: "exit" }
      ],
      build: buildInsertion
    },
    {
      id: "shell",
      name: "希尔排序",
      en: "SHELL SORT",
      file: "shell_sort.c",
      summary: "以逐渐缩小的增量 gap 做插入排序，让元素先大步接近目标位置，再进行最后的小步修正。",
      complexity: { best: "O(n log n)", average: "≈O(n^1.3)", worst: "O(n²)", space: "O(1)" },
      stable: "不稳定",
      inPlace: "原地",
      tags: ["增量序列", "分组插入", "原地"],
      mental: {
        title: "先大跨度，再小跨度",
        invariant: "当增量为 gap 时，所有间隔为 gap 的子序列都分别有序；gap 最终变为 1，整个数组有序。",
        takeaways: [
          "本质是带间隔的插入排序，不是一种全新的比较方式。",
          "增量序列会影响性能；n/2 折半序列简单但不是最优。",
          "不稳定，因为跨 gap 的远距离移动会打乱相等元素的相对顺序。"
        ]
      },
      codeTips: [
        { title: "gap 由大到小", text: "gap /= 2 让分组越来越细，最终 gap = 1 时执行普通插入排序。" },
        { title: "j 的起点是 i", text: "待插入的 key 保存在 a[i]，它原来的位置先当作空位。" },
        { title: "步长是 gap", text: "比较 a[j-gap] 与 key，移动时一次跨 gap 格。" }
      ],
      stepsWhy: "希尔排序把插入排序的一次一格移动，升级为一次 gap 格。",
      code: [
        { t: "void shell_sort(int a[], int n) {", anchor: "entry" },
        { t: "    for (int gap = n / 2; gap > 0; gap /= 2) {", anchor: "gap" },
        { t: "        for (int i = gap; i < n; i++) {", anchor: "pick" },
        { t: "            int key = a[i];", anchor: "keyInit" },
        { t: "            int j = i;", anchor: "jInit" },
        { t: "            while (j >= gap && a[j - gap] > key) {", anchor: "while" },
        { t: "                a[j] = a[j - gap];", anchor: "shift" },
        { t: "                j -= gap;", anchor: "decrement" },
        { t: "            }" },
        { t: "            a[j] = key;", anchor: "place" },
        { t: "        }" },
        { t: "    }" },
        { t: "}", anchor: "exit" }
      ],
      build: buildShell
    },
    {
      id: "merge",
      name: "归并排序",
      en: "MERGE SORT",
      file: "merge_sort.c",
      summary: "递归把数组对半拆分，直到单元素，再从下往上合并两个有序区间。",
      complexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)" },
      stable: "稳定",
      inPlace: "需辅助数组",
      tags: ["分治", "稳定", "O(n) 额外空间"],
      mental: {
        title: "拆分到最小，再合并有序段",
        invariant: "merge 开始时，a[lo..mid] 与 a[mid+1..hi] 各自有序；merge 结束后，a[lo..hi] 整体有序。",
        takeaways: [
          "递归树有 log n 层，每层合并总成本 O(n)。",
          "使用 <= 选择左段，保证相等元素的相对顺序不变。",
          "需要 O(n) 临时空间，适合链表、外部排序等场景。"
        ]
      },
      codeTips: [
        { title: "tmp 是临时缓冲区", text: "合并结果先写入 tmp，最后统一 copyBack，避免边读边写互相覆盖。" },
        { title: "先比较再取值", text: "i 和 j 分别代表两段的当前队首，k 是 tmp 的写指针。" },
        { title: "剩余段直接搬运", text: "一段耗尽后，另一段剩余部分已经有序，用 while 直接复制即可。" }
      ],
      stepsWhy: "归并排序的比较只发生在两个有序段的队首之间。",
      code: [
        { t: "void merge(int a[], int tmp[], int lo, int mid, int hi) {", anchor: "mergeEntry" },
        { t: "    int i = lo, j = mid + 1, k = lo;", anchor: "init" },
        { t: "    while (i <= mid && j <= hi) {", anchor: "whileCompare" },
        { t: "        if (a[i] <= a[j]) {", anchor: "compare" },
        { t: "            tmp[k++] = a[i++];", anchor: "takeLeft" },
        { t: "        } else {" },
        { t: "            tmp[k++] = a[j++];", anchor: "takeRight" },
        { t: "        }" },
        { t: "    }" },
        { t: "    while (i <= mid) tmp[k++] = a[i++];", anchor: "drainLeft" },
        { t: "    while (j <= hi) tmp[k++] = a[j++];", anchor: "drainRight" },
        { t: "    for (k = lo; k <= hi; k++) {", anchor: "copyBack" },
        { t: "        a[k] = tmp[k];" },
        { t: "    }", anchor: "merged" },
        { t: "}" },
        { t: "" },
        { t: "void merge_sort(int a[], int tmp[], int lo, int hi) {", anchor: "entry" },
        { t: "    if (lo >= hi) return;", anchor: "base" },
        { t: "    int mid = lo + (hi - lo) / 2;", anchor: "split" },
        { t: "    merge_sort(a, tmp, lo, mid);", anchor: "recurseLeft" },
        { t: "    merge_sort(a, tmp, mid + 1, hi);", anchor: "recurseRight" },
        { t: "    merge(a, tmp, lo, mid, hi);", anchor: "callMerge" },
        { t: "}", anchor: "exit" }
      ],
      build: buildMerge
    },
    {
      id: "quick",
      name: "快速排序",
      en: "QUICK SORT",
      file: "quick_sort.c",
      summary: "选一个基准值 pivot，把小于它的元素放到左边，再递归排序左右两个分区。",
      complexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n²)", space: "O(log n)" },
      stable: "不稳定",
      inPlace: "原地",
      tags: ["基准 pivot", "分治", "平均最快"],
      mental: {
        title: "让 pivot 一次性到达最终位置",
        invariant: "partition 完成后，pivot 左边的值都小于它，右边的值都不小于它；pivot 不再参与递归。",
        takeaways: [
          "平均 O(n log n)，常数小，是很多标准库排序的基础。",
          "固定末位 pivot 遇到有序输入会退化；随机化或三数取中可以缓解。",
          "原地排序但递归需要 O(log n) 栈空间；不稳定。"
        ]
      },
      codeTips: [
        { title: "i 是左分区边界", text: "a[lo..i-1] 始终保存小于 pivot 的元素；j 负责扫描。" },
        { title: "先交换再前进", text: "遇到 a[j] < pivot，把 a[j] 换到 i，再让 i++ 扩大左分区。" },
        { title: "pivot 最后归位", text: "循环结束后，把 a[i] 与 a[hi] 交换，pivot 便落在最终位置。" }
      ],
      stepsWhy: "快速排序的每一次扫描，都在维护「左分区全部小于 pivot」这个不变式。",
      code: [
        { t: "int partition(int a[], int lo, int hi) {", anchor: "partitionEntry" },
        { t: "    int pivot = a[hi];", anchor: "pivot" },
        { t: "    int i = lo;", anchor: "iInit" },
        { t: "    for (int j = lo; j < hi; j++) {", anchor: "loop" },
        { t: "        if (a[j] < pivot) {", anchor: "compare" },
        { t: "            int t = a[i];", anchor: "swapStart" },
        { t: "            a[i] = a[j];", anchor: "swapMid" },
        { t: "            a[j] = t;", anchor: "swapEnd" },
        { t: "            i++;", anchor: "increment" },
        { t: "        }" },
        { t: "    }" },
        { t: "    int t = a[i];", anchor: "placeStart" },
        { t: "    a[i] = a[hi];", anchor: "placeMid" },
        { t: "    a[hi] = t;", anchor: "placeEnd" },
        { t: "    return i;", anchor: "return" },
        { t: "}" },
        { t: "" },
        { t: "void quick_sort(int a[], int lo, int hi) {", anchor: "entry" },
        { t: "    if (lo >= hi) return;", anchor: "base" },
        { t: "    int p = partition(a, lo, hi);", anchor: "partitionCall" },
        { t: "    quick_sort(a, lo, p - 1);", anchor: "recurse" },
        { t: "    quick_sort(a, p + 1, hi);", anchor: "recurseRight" },
        { t: "}", anchor: "exit" }
      ],
      build: buildQuick
    },
    {
      id: "heap",
      name: "堆排序",
      en: "HEAP SORT",
      file: "heap_sort.c",
      summary: "把数组整理成最大堆，反复取出堆顶最大值放到末尾，再恢复堆性质。",
      complexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(1)" },
      stable: "不稳定",
      inPlace: "原地",
      tags: ["最大堆", "原地", "稳定 O(n log n)"],
      mental: {
        title: "数组也是一棵完全二叉树",
        invariant: "在堆的有效区间内，每个父节点都不小于它的孩子；堆顶 a[0] 始终是当前最大值。",
        takeaways: [
          "建堆从最后一个非叶节点开始向前下沉，整体 O(n)。",
          "每次取堆顶后，堆大小减一，再对根节点做一次 sift-down。",
          "堆排序稳定 O(n log n) 且原地，但通常不是稳定排序。"
        ]
      },
      codeTips: [
        { title: "父子索引关系", text: "i 的左孩子是 2*i+1，右孩子是 2*i+2；无需额外的树节点。" },
        { title: "largest 先指向父节点", text: "分别与左右孩子比较，largest 最终保存三者中最大值的索引。" },
        { title: "递归下沉", text: "交换后，被换到子节点的旧父节点可能仍不满足堆性质，需要继续调整。" }
      ],
      stepsWhy: "堆排序的比较发生在父节点与它的两个孩子之间。",
      code: [
        { t: "void sift_down(int a[], int n, int i) {", anchor: "heapifyEntry" },
        { t: "    int largest = i;", anchor: "largestInit" },
        { t: "    int left = 2 * i + 1;", anchor: "left" },
        { t: "    int right = 2 * i + 2;", anchor: "right" },
        { t: "    if (left < n && a[left] > a[largest])", anchor: "compareLeft" },
        { t: "        largest = left;", anchor: "setLeft" },
        { t: "    if (right < n && a[right] > a[largest])", anchor: "compareRight" },
        { t: "        largest = right;", anchor: "setRight" },
        { t: "    if (largest != i) {", anchor: "swapStart" },
        { t: "        int t = a[i];", anchor: "swapMid" },
        { t: "        a[i] = a[largest];", anchor: "swapMid2" },
        { t: "        a[largest] = t;", anchor: "swapEnd" },
        { t: "        sift_down(a, n, largest);", anchor: "recurse" },
        { t: "    }", anchor: "settle" },
        { t: "}" },
        { t: "" },
        { t: "void heap_sort(int a[], int n) {", anchor: "entry" },
        { t: "    for (int i = n / 2 - 1; i >= 0; i--)", anchor: "build" },
        { t: "        sift_down(a, n, i);" },
        { t: "    for (int end = n - 1; end > 0; end--) {", anchor: "extract" },
        { t: "        int t = a[0];", anchor: "extractSwap" },
        { t: "        a[0] = a[end];" },
        { t: "        a[end] = t;", anchor: "extractDone" },
        { t: "        sift_down(a, end, 0);" },
        { t: "    }" },
        { t: "}", anchor: "exit" }
      ],
      build: buildHeap
    }
  ];

  /* Build line maps + validate defaults at module load. */
  algorithms.forEach((algorithm, index) => {
    algorithm.index = index + 1;
    algorithm.lineMap = {};
    algorithm.code.forEach((line, lineIndex) => {
      if (line.anchor) algorithm.lineMap[line.anchor] = lineIndex + 1;
    });
    algorithm.totalLines = algorithm.code.length;
    algorithm.codeText = algorithm.code.map((line) => line.t).join("\n");

    const probe = algorithm.build(DEFAULT_ARRAY);
    const last = probe[probe.length - 1];
    if (!last.done) {
      console.warn(`[SortLab] ${algorithm.id} trace does not terminate with a completed step.`);
    }
    const sortedOk = last.array.every((value, i) => i === 0 || last.array[i - 1] <= value);
    if (!sortedOk) {
      console.warn(`[SortLab] ${algorithm.id} trace produced an unsorted array.`, last.array);
    }
  });

  global.SortLab = {
    algorithms,
    defaultArray: DEFAULT_ARRAY,
    limits: { minLength: MIN_LENGTH, maxLength: MAX_LENGTH, minValue: MIN_VALUE, maxValue: MAX_VALUE }
  };
})(typeof window !== "undefined" ? window : globalThis);
