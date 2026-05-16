(function () {
  "use strict";

  var fallbackStatus = {
    updatedAt: "2026-05-17T09:00:00+09:00",
    deck: {
      title: "상태판",
      mode: "iPad mini 2",
      refreshSeconds: 30
    },
    helm: {
      name: "Helm 프로젝트",
      state: "watch",
      phase: "검토 중",
      progress: 64,
      summary: "완성 조건을 확인하며 상태판 연동 지점을 정리 중",
      reviewItems: 7,
      blockers: 1,
      nextCheckpoint: "완료 기준 확정",
      services: [
        { name: "검토 상태", detail: "핵심 요구사항과 완료 기준 확인", state: "watch", label: "진행" },
        { name: "실행 상태", detail: "상태 API 연결 대기", state: "warn", label: "대기" },
        { name: "기록", detail: "결정 사항은 Obsidian에 저장 예정", state: "ok", label: "준비" }
      ]
    },
    ogwang: {
      name: "오광이",
      state: "ok",
      label: "정상",
      presence: "대기 중",
      mood: "차분",
      battery: 86,
      signal: "좋음",
      lastSeen: "2026-05-17T09:00:00+09:00",
      metrics: [
        { label: "배터리", value: "86%" },
        { label: "신호", value: "좋음" },
        { label: "모드", value: "상시 노출" },
        { label: "응답", value: "준비" }
      ]
    },
    timeline: [
      { title: "검토", detail: "완료 조건과 상태 소스 정리", state: "watch" },
      { title: "연동", detail: "Helm/오광이 상태 JSON 또는 API 연결", state: "warn" },
      { title: "거치", detail: "iPad mini 2 홈 화면 고정", state: "ok" }
    ],
    events: [
      { title: "HelmDeck 초안", detail: "정적 대시보드 준비", state: "ok" },
      { title: "데이터 소스", detail: "status.json 사용 중", state: "watch" }
    ]
  };

  var stateLabels = {
    ok: "정상",
    watch: "관찰",
    warn: "주의",
    alert: "경고",
    off: "꺼짐"
  };

  var currentData = fallbackStatus;
  var refreshTimer = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var node = byId(id);
    if (node) {
      node.textContent = value == null || value === "" ? "-" : String(value);
    }
  }

  function normalizeState(state) {
    if (state === "ok" || state === "watch" || state === "warn" || state === "alert" || state === "off") {
      return state;
    }
    return "watch";
  }

  function setState(node, state) {
    if (node) {
      node.setAttribute("data-state", normalizeState(state));
    }
  }

  function clampPercent(value) {
    var number = parseInt(value, 10);
    if (isNaN(number)) {
      return 0;
    }
    if (number < 0) {
      return 0;
    }
    if (number > 100) {
      return 100;
    }
    return number;
  }

  function pad(number) {
    return number < 10 ? "0" + number : String(number);
  }

  function formatClock(date) {
    return pad(date.getHours()) + ":" + pad(date.getMinutes());
  }

  function formatDate(date) {
    return date.getFullYear() + "." + pad(date.getMonth() + 1) + "." + pad(date.getDate());
  }

  function formatRelative(isoValue) {
    if (!isoValue) {
      return "-";
    }
    var then = new Date(isoValue);
    if (isNaN(then.getTime())) {
      return String(isoValue);
    }

    var diff = Math.max(0, Date.now() - then.getTime());
    var seconds = Math.floor(diff / 1000);
    if (seconds < 60) {
      return "방금 전";
    }
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return minutes + "분 전";
    }
    var hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return hours + "시간 전";
    }
    return formatDate(then) + " " + formatClock(then);
  }

  function getQuerySource() {
    var match = window.location.search.match(/[?&]source=([^&]+)/);
    if (!match) {
      return "status.json";
    }
    try {
      return decodeURIComponent(match[1].replace(/\+/g, " "));
    } catch (error) {
      return "status.json";
    }
  }

  function requestJson(url, done) {
    var xhr = new XMLHttpRequest();
    var bust = url.indexOf("?") === -1 ? "?t=" : "&t=";
    xhr.open("GET", url + bust + Date.now(), true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) {
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          done(null, JSON.parse(xhr.responseText));
        } catch (error) {
          done(error);
        }
      } else {
        done(new Error("status " + xhr.status));
      }
    };
    xhr.onerror = function () {
      done(new Error("network error"));
    };
    xhr.send();
  }

  function renderMetrics(metrics) {
    var target = byId("ogwangMetrics");
    if (!target) {
      return;
    }
    var list = Array.isArray(metrics) ? metrics : [];
    var html = "";
    for (var i = 0; i < list.length; i += 1) {
      html += '<article class="metric-tile"><span class="metric-label">' +
        escapeHtml(list[i].label) +
        '</span><strong>' +
        escapeHtml(list[i].value) +
        "</strong></article>";
    }
    target.innerHTML = html;
  }

  function renderServices(services) {
    var target = byId("serviceList");
    if (!target) {
      return;
    }
    var list = Array.isArray(services) ? services : [];
    var html = "";
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      var state = normalizeState(item.state);
      html += '<article class="service-row" data-state="' + state + '">' +
        "<div><p class=\"service-title\">" + escapeHtml(item.name) + "</p>" +
        "<p class=\"service-detail\">" + escapeHtml(item.detail) + "</p></div>" +
        '<span class="status-chip" data-state="' + state + '">' + escapeHtml(item.label || stateLabels[state]) + "</span>" +
        "</article>";
    }
    target.innerHTML = html;
  }

  function renderTimeline(items) {
    var target = byId("timelineList");
    if (!target) {
      return;
    }
    var list = Array.isArray(items) ? items : [];
    var html = "";
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      var state = normalizeState(item.state);
      html += '<article class="timeline-item" data-state="' + state + '">' +
        '<span class="timeline-index">' + (i + 1) + "</span>" +
        "<div><p class=\"timeline-title\">" + escapeHtml(item.title) + "</p>" +
        "<p class=\"timeline-detail\">" + escapeHtml(item.detail) + "</p></div>" +
        "</article>";
    }
    target.innerHTML = html;
  }

  function renderEvents(items) {
    var target = byId("eventList");
    if (!target) {
      return;
    }
    var list = Array.isArray(items) ? items : [];
    var html = "";
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      var state = normalizeState(item.state);
      html += '<article class="event-row" data-state="' + state + '">' +
        '<span class="event-marker"></span>' +
        "<div><p class=\"event-title\">" + escapeHtml(item.title) + "</p>" +
        "<p class=\"event-detail\">" + escapeHtml(item.detail) + "</p></div>" +
        "</article>";
    }
    target.innerHTML = html;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function render(data, sourceState, sourceText) {
    var deck = data.deck || {};
    var helm = data.helm || {};
    var ogwang = data.ogwang || {};
    var helmState = normalizeState(helm.state);
    var ogwangState = normalizeState(ogwang.state);
    var refreshSeconds = deck.refreshSeconds || 30;
    var progress = clampPercent(helm.progress);

    currentData = data;

    setText("deckTitle", deck.title || "상태판");
    setText("deckMode", deck.mode || "iPad mini 2");
    setText("refreshCadence", refreshSeconds + "초");

    setText("helmTitle", helm.name || "Helm 프로젝트");
    setText("helmPhase", helm.phase || stateLabels[helmState]);
    setText("helmSummary", helm.summary || "-");
    setText("helmProgressText", progress + "%");
    setText("reviewItems", helm.reviewItems);
    setText("blockerCount", helm.blockers);
    setText("nextCheckpoint", helm.nextCheckpoint);
    setText("lastUpdated", "업데이트 " + formatRelative(data.updatedAt));

    var progressBar = byId("helmProgressBar");
    var progressTrack = document.querySelector(".progress-track");
    if (progressBar) {
      progressBar.style.width = progress + "%";
    }
    if (progressTrack) {
      progressTrack.setAttribute("aria-valuenow", String(progress));
    }

    setText("ogwangTitle", ogwang.name || "오광이");
    setText("ogwangState", ogwang.label || stateLabels[ogwangState]);
    setText("ogwangInitial", (ogwang.name || "오").charAt(0));
    setText("ogwangPresence", ogwang.presence || "-");
    setText("ogwangMood", ogwang.mood || "-");
    setText("ogwangSignal", "신호 " + (ogwang.signal || "-"));
    setText("ogwangLastSeen", "마지막 응답 " + formatRelative(ogwang.lastSeen));

    setState(byId("helmPhase"), helmState);
    setState(byId("ogwangPanel"), ogwangState);
    setState(byId("ogwangState"), ogwangState);
    setState(byId("sourcePill"), sourceState || "ok");
    setText("sourceLabel", sourceText || "연결됨");
    setState(document.querySelector(".heartbeat-strip"), ogwangState);
    setText("heartbeatText", "오광이 " + (ogwang.label || stateLabels[ogwangState]) + " · Helm " + (helm.phase || stateLabels[helmState]));

    renderMetrics(ogwang.metrics);
    renderServices(helm.services);
    renderTimeline(data.timeline);
    renderEvents(data.events);

    scheduleRefresh(refreshSeconds);
  }

  function scheduleRefresh(seconds) {
    var interval = Math.max(10, parseInt(seconds, 10) || 30) * 1000;
    if (refreshTimer) {
      window.clearInterval(refreshTimer);
    }
    refreshTimer = window.setInterval(loadStatus, interval);
  }

  function updateClock() {
    var now = new Date();
    setText("clockTime", formatClock(now));
    setText("clockDate", formatDate(now));
  }

  function loadStatus() {
    var source = getQuerySource();
    requestJson(source, function (error, data) {
      if (error) {
        render(currentData || fallbackStatus, "warn", "샘플");
        return;
      }
      render(data, "ok", "연결됨");
    });
  }

  function init() {
    updateClock();
    window.setInterval(updateClock, 1000);

    var refreshButton = byId("refreshButton");
    if (refreshButton) {
      refreshButton.addEventListener("click", loadStatus);
    }

    render(fallbackStatus, "watch", "로딩");
    loadStatus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
