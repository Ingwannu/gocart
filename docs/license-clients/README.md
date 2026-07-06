# License Clients

판매하는 제품(디스코드 봇, 마인크래프트 플러그인)에 넣는 라이센스 검증 클라이언트 모음입니다.
쇼핑몰의 `POST /api/license/validate` 엔드포인트와 짝을 이룹니다.

## 1. 서버 준비 (한 번만)

```bash
npm run license:keygen
```

- `LICENSE_SIGNING_PRIVATE_KEY` → 쇼핑몰 `.env`에 추가 (절대 유출 금지)
- `LICENSE_PUBLIC_KEY` → 아래 클라이언트들의 `publicKey` 자리에 붙여넣어 제품에 임베드

공개키를 임베드하면 크랙러가 hosts 파일이나 프록시로 가짜 "항상 valid" 서버를 세워도
서명 검증에서 거부됩니다. (소스 제공 상품은 코드를 고치면 우회 가능 — 컴파일 배포인
Rust/Java 쪽이 실질 보호력이 높습니다.)

## 2. 검증 흐름

1. 제품이 시작할 때 `{ key, productId, instanceId, nonce }`를 POST.
2. 첫 검증에서 키가 `instanceId`(디코 서버 ID, 마크 서버 IP 등)에 **자동 바인딩**.
   이후 다른 인스턴스는 `instance_mismatch`로 거부.
3. 응답의 `payload`(JSON 문자열)와 `signature`(Ed25519)를 공개키로 검증하고,
   `nonce` 일치 + `signedAt` 5분 이내인지 확인.
4. 주기적 재검증(하트비트) → 환불된 키는 자동 회수되어 원격으로 꺼짐.

거부 사유: `unknown_key` `revoked` `unpaid` `product_mismatch` `instance_mismatch`

**네트워크 오류는 라이센스 실패로 취급하지 마세요.** 쇼핑몰이 잠깐 죽었다고 고객 봇이
꺼지면 안 됩니다. 제공된 클라이언트는 연속 N회(기본 5회) 실패까지 봐줍니다.

## 3. 클라이언트

### Node.js / TypeScript ([nodejs/license-client.ts](nodejs/license-client.ts)) — 의존성 0개

```ts
import { LicenseClient } from "./license-client.ts";

const license = new LicenseClient({
	apiUrl: "https://your-shop.com/api/license/validate",
	licenseKey: process.env.LICENSE_KEY!,
	productId: "prod_xxx",
	instanceId: guildId,
	publicKey: "MCowBQYDK2VwAyEA...",
});
await license.enforce();      // invalid → process.exit(1)
license.startHeartbeat();     // 6시간마다 재검증 (킬스위치)
```

### Rust ([rust/](rust/)) — `wicked-license` 크레이트

`Cargo.toml`에 경로 의존성으로 추가하거나 소스를 복사하세요.
블로킹 HTTP(ureq)라서 async 봇(serenity/poise)에서는 `spawn_blocking`으로 감싸세요.

```rust
let client = LicenseClient::new(API_URL, license_key)
    .product_id("prod_xxx")
    .instance_id(guild_id)
    .public_key("MCowBQYDK2VwAyEA...");
match tokio::task::spawn_blocking(move || client.validate()).await? {
    Ok(_) => {}
    Err(Reason::NetworkError) => { /* grace */ }
    Err(reason) => { eprintln!("invalid license: {reason:?}"); std::process::exit(1); }
}
```

### Java / Paper·Spigot ([java/WickedLicenseClient.java](java/WickedLicenseClient.java)) — Gson만 사용(서버 내장)

패키지명을 플러그인에 맞게 바꿔서 복사하세요. `onEnable`에서 **비동기로** 검증하고,
실패 시 메인 스레드에서 `disablePlugin` 하세요 (파일 상단 Javadoc에 전체 예제 있음).
난독화(ProGuard 등)를 병행해야 상수로 박힌 공개키·검증 로직을 지우기 어려워집니다.

## 4. EULA

[EULA-template.md](EULA-template.md)를 채워서 ① 상품 페이지에 게시, ② 판매 zip에
`LICENSE.txt`로 동봉하세요. 디지털 콘텐츠 청약철회 제한(제7조)은 **구매 전 고지**해야
효력이 있으니 상품 설명에 반드시 표시하세요.
