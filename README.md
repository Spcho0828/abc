# NearCheck · 법인카드 위치 분석

법인카드 사용 내역과 주거지 사이의 거리를 분석하는 정적 웹앱입니다. XLSX/CSV 불러오기, 카카오 지도, 20가지 이상징후 시나리오, Gemini 추가 분석을 제공합니다.

원본: https://card-neighborhood-check.sei-ax-1743.chatgpt.site/

공개 사이트에서 제공되는 HTML, CSS, JavaScript 파일을 가져왔습니다. 서버 소스나 원본 Git 이력은 포함되지 않습니다.

## 실행

저장소 폴더를 정적 웹 서버로 제공하세요. 별도의 빌드나 패키지 설치는 필요하지 않습니다.

## GitHub Pages

저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 설정하세요. main 브랜치에 변경을 올리거나 Actions에서 Deploy GitHub Pages를 실행하면 배포합니다.

배포 성공 후 주소: https://spcho0828.github.io/abc/

카카오 지도 사용 시 JavaScript SDK 도메인에 `https://spcho0828.github.io`를 등록하고 앱 화면에서 JavaScript 키를 입력하세요. Gemini 키도 앱 화면에서 입력합니다. 키를 저장소에 넣지 마세요.

분석 데이터와 API 키는 사이트 서버에 저장하지 않습니다. 주소 검색은 카카오로, 사용자가 승인한 AI 분석 내용은 Google Gemini로 전송됩니다.
