import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Health Zzang API",
    version: "1.0.0",
    description: "운동 크루 인증 & 벌금 집계 서비스 API",
  },
  servers: [{ url: "/api" }],
  paths: {
    "/members": {
      get: {
        tags: ["Members"],
        summary: "크루원 목록 조회",
        description: "현재 로그인한 유저의 크루원 목록을 반환합니다.",
        responses: {
          "200": {
            description: "크루원 목록",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Member" } } } },
          },
        },
      },
    },
    "/workout": {
      post: {
        tags: ["Workout"],
        summary: "운동 인증 등록",
        description: "운동 기록을 추가합니다. tagged_with로 함께 운동한 크루원을 태그할 수 있습니다.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["date"],
                properties: {
                  date: { type: "string", format: "date", example: "2026-10-07", description: "운동 날짜 (YYYY-MM-DD)" },
                  note: { type: "string", example: "헬스 + 러닝", description: "운동 내용 메모 (선택)" },
                  media: {
                    type: "array",
                    description: "업로드한 미디어 정보 (presigned URL로 R2에 업로드 후)",
                    items: {
                      type: "object",
                      properties: {
                        r2_key: { type: "string" },
                        type: { type: "string", enum: ["photo", "video"] },
                        size_bytes: { type: "integer" },
                      },
                    },
                  },
                  tagged_with: { type: "array", items: { type: "string", format: "uuid" }, description: "함께 운동한 크루원 ID 배열" },
                  user_id: { type: "string", format: "uuid", description: "대상 유저 ID (마이그레이션용, 생략 시 본인)" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "생성된 workout" }, "400": { description: "유효성 오류" } },
      },
      patch: {
        tags: ["Workout"],
        summary: "운동 기록 수정",
        description: "본인의 운동 기록을 수정합니다.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["workout_id"],
                properties: {
                  workout_id: { type: "string", format: "uuid", description: "수정할 workout ID" },
                  date: { type: "string", format: "date", description: "변경할 날짜" },
                  note: { type: "string", description: "변경할 메모" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "수정 성공" }, "403": { description: "본인 기록만 수정 가능" } },
      },
      delete: {
        tags: ["Workout"],
        summary: "운동 기록 삭제",
        description: "본인의 운동 기록을 삭제합니다. 연결된 미디어도 함께 삭제.",
        parameters: [{ name: "id", in: "query", required: true, schema: { type: "string", format: "uuid" }, description: "삭제할 workout ID" }],
        responses: { "200": { description: "삭제 성공" }, "403": { description: "본인 기록만 삭제 가능" } },
      },
    },
    "/workout/migrate": {
      post: {
        tags: ["Migration"],
        summary: "과거 기록 일괄 추가",
        description: "service_role key 인증. 닉네임 + 날짜로 과거 운동 기록을 일괄 생성합니다. 미디어 없이 기록만.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["records"],
                properties: {
                  records: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["nickname", "date"],
                      properties: {
                        nickname: { type: "string", example: "이현규", description: "크루원 이름" },
                        date: { type: "string", format: "date", example: "2026-09-05" },
                        note: { type: "string", example: "헬스", description: "메모 (선택)" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "각 레코드별 결과" } },
      },
    },
    "/media": {
      post: {
        tags: ["Media"],
        summary: "미디어 업로드 URL 생성",
        description: "R2 presigned upload URL을 생성합니다. 클라이언트가 이 URL로 직접 PUT 업로드.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["contentType", "fileExtension"],
                properties: {
                  contentType: { type: "string", example: "image/jpeg" },
                  fileExtension: { type: "string", example: "jpg" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "uploadUrl + key 반환" } },
      },
    },
    "/season": {
      post: {
        tags: ["Season"],
        summary: "시즌 생성",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "start_date", "default_target_count", "default_penalty_per_miss"],
                properties: {
                  name: { type: "string", example: "시즌 6" },
                  start_date: { type: "string", format: "date" },
                  default_target_count: { type: "integer", example: 3 },
                  default_penalty_per_miss: { type: "integer", example: 1000 },
                  default_reward_per_extra: { type: "integer", example: 0 },
                },
              },
            },
          },
        },
        responses: { "201": { description: "시즌 생성" } },
      },
      patch: {
        tags: ["Season"],
        summary: "시즌 수정",
        description: "action: update_info (이름/날짜), update_defaults (기본 규칙), update_defaults_with_migration (소급 적용), end (종료)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["season_id", "action"],
                properties: {
                  season_id: { type: "string", format: "uuid" },
                  action: { type: "string", enum: ["update_info", "update_defaults", "update_defaults_with_migration", "end"] },
                  name: { type: "string" },
                  start_date: { type: "string", format: "date" },
                  end_date: { type: "string", format: "date", nullable: true },
                  default_target_count: { type: "integer" },
                  default_penalty_per_miss: { type: "integer" },
                  default_reward_per_extra: { type: "integer" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "수정 성공" } },
      },
    },
    "/weekly-rule": {
      post: {
        tags: ["Season"],
        summary: "주간 규칙 생성/수정 (override)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["season_id", "week_start", "target_count", "penalty_per_miss"],
                properties: {
                  season_id: { type: "string", format: "uuid" },
                  week_start: { type: "string", format: "date", description: "해당 주 월요일 날짜" },
                  target_count: { type: "integer" },
                  penalty_per_miss: { type: "integer" },
                  reward_per_extra: { type: "integer" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "규칙 저장" } },
      },
    },
    "/health": {
      get: {
        tags: ["System"],
        summary: "서비스 상태 + DB 응답시간",
        responses: { "200": { description: "상태 및 타이밍 정보" } },
      },
    },
  },
  components: {
    schemas: {
      Member: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          nickname: { type: "string", example: "이현규" },
          created_at: { type: "string", format: "date-time" },
        },
      },
    },
    securitySchemes: {
      BearerAuth: { type: "http", scheme: "bearer", description: "SUPABASE_SERVICE_ROLE_KEY" },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
