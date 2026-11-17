# 사이

출발지와 도착지를 검색해 두 장소 사이의 직선거리를 확인하는 정적 웹앱입니다. 장소 검색은 OpenStreetMap Nominatim을 사용하며, 결과 아래의 **지도에서 보기**를 누르면 OpenStreetMap 길찾기로 이동합니다.

## 실행

`index.html`을 브라우저에서 열거나 정적 파일 서버로 제공하면 됩니다. 빌드, 서버 함수, Redis, API 키, 환경변수는 필요하지 않습니다.

## Vercel 배포

GitHub 저장소를 Vercel에 가져온 뒤 Framework Preset을 **Other**로 선택하고 Build Command와 Output Directory를 비워 둔 채 배포하세요. 이 저장소의 루트 `index.html`이 바로 제공됩니다.

## 거리와 장소 검색

- 거리는 검색된 좌표 사이의 대원거리(직선거리)이며, 자동차·도보 이동 경로의 거리가 아닙니다.
- 검색은 브라우저에서 Nominatim 공개 API를 직접 호출합니다. 공개 서비스의 이용 정책과 사용량 제한을 준수해야 하며, 대량 트래픽이나 자동화된 검색에는 적합하지 않습니다.
