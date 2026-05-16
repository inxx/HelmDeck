# HelmDeck

iPad mini 2에 상시 띄워둘 수 있는 Helm 프로젝트/오광이 상태 대시보드입니다.
의존성 없는 정적 파일로 시작해서 오래된 Safari에서도 가볍게 열리도록 했고,
나중에 `status.json`만 갱신하거나 `?source=`로 API를 연결할 수 있게 구성했습니다.

## 실행

```sh
python3 -m http.server 4173
```

브라우저에서 `http://localhost:4173`을 엽니다.
iPad mini 2에서는 같은 Wi-Fi에서 `http://<Mac-IP>:4173`으로 접속한 뒤 홈 화면에 추가하면 됩니다.

## 파일

- `index.html` - 대시보드 화면
- `styles.css` - iPad mini 2 기준의 반응형 레이아웃
- `app.js` - 상태 로딩, 자동 갱신, 렌더링
- `status.json` - 현재 표시되는 상태 데이터
- `status.sample.json` - 상태 데이터 예시

## 상태 데이터

기본 데이터 소스는 `status.json`입니다. 다른 API를 쓰려면 URL에 source를 붙입니다.

```text
http://localhost:4173/?source=/api/helmdeck/status
```

상태 값은 `ok`, `watch`, `warn`, `alert`, `off`를 사용합니다.

```json
{
  "updatedAt": "2026-05-17T09:00:00+09:00",
  "deck": {
    "title": "상태판",
    "mode": "iPad mini 2",
    "refreshSeconds": 30
  },
  "helm": {
    "name": "Helm 프로젝트",
    "state": "watch",
    "phase": "검토 중",
    "progress": 64,
    "summary": "완성 조건을 확인하며 상태판 연동 지점을 정리 중",
    "reviewItems": 7,
    "blockers": 1,
    "nextCheckpoint": "완료 기준 확정"
  },
  "ogwang": {
    "name": "오광이",
    "state": "ok",
    "label": "정상",
    "presence": "대기 중",
    "mood": "차분",
    "signal": "좋음",
    "lastSeen": "2026-05-17T09:00:00+09:00"
  }
}
```
