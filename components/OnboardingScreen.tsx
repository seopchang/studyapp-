import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: WIN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 390;
const fontScale = Math.min(WIN_WIDTH / BASE_WIDTH, 1.5);
const paddingScale = Math.min(WIN_WIDTH / BASE_WIDTH, 1.4);
const fs = (size: number) => Math.round(size * fontScale);
const ps = (size: number) => Math.round(size * paddingScale);

// ─── 공통 컴포넌트 ──────────────────────────────────────────────

function SectionCard({ color, title, body, children }: { color: string; title: string; body: string; children?: React.ReactNode }) {
  return (
    <View style={c.card}>
      <View style={c.cardHead}>
        <View style={[c.cardDot, { backgroundColor: color }]} />
        <Text style={c.cardTitle}>{title}</Text>
      </View>
      <Text style={c.cardBody}>{body}</Text>
      {children ? <View style={c.previewWrap}>{children}</View> : null}
    </View>
  );
}

function MockScreen({ children }: { children: React.ReactNode }) {
  return <View style={c.mockScreen}>{children}</View>;
}

function Sep() { return <View style={c.sep} />; }
function Lbl({ text }: { text: string }) { return <Text style={c.lbl}>{text}</Text>; }

// 흰 카드 아이템 (홈탭 스타일)
function ItemCard({ name, completed, color, borderColor }: { name: string; completed: boolean; color?: string; borderColor?: string }) {
  return (
    <View style={[c.itemCard, completed && { borderColor: borderColor || '#111111', borderWidth: 2 }]}>
      <View style={{ marginRight: ps(10) }}>
        {completed
          ? <Ionicons name="checkmark-circle" size={fs(20)} color={borderColor || '#111111'} />
          : <Ionicons name="ellipse-outline" size={fs(20)} color="#D3D3D3" />}
      </View>
      {color && <View style={{ width: ps(4), height: ps(20), borderRadius: 2, backgroundColor: color, marginRight: ps(12) }} />}
      <Text style={{ fontSize: fs(13), fontWeight: '600', color: completed ? '#9CA3AF' : '#111', flex: 1 }}>{name}</Text>
    </View>
  );
}

// ─── 슬라이드 1: 홈탭 — 기본 화면 ──────────────────────────────

function Slide1() {
  return (
    <ScrollView style={c.scrollArea} contentContainerStyle={c.scrollContent} showsVerticalScrollIndicator={false}>
      <SectionCard
        color="#6366F1"
        title="D-Day 배지"
        body={'상단에 D-Day 배지가 가로로 나열됩니다.\n+ D-Day 추가를 탭해 시험일·마감일 등을 추가하고,\n배지를 탭하면 수정·삭제할 수 있어요.'}
      >
        <MockScreen>
          <View style={{ flexDirection: 'row', gap: ps(6) }}>
            {[{ name: '토익', d: 'D-23' }, { name: '졸업논문', d: 'D-45' }].map(({ name, d }) => (
              <View key={name} style={{ backgroundColor: '#FFFFFF', paddingHorizontal: ps(14), paddingVertical: ps(9), borderRadius: ps(10), borderWidth: 1, borderColor: '#EAEAEA', flexDirection: 'row', alignItems: 'center', gap: ps(8) }}>
                <Text style={{ fontSize: fs(12), color: '#7E7E7E' }}>{name}</Text>
                <Text style={{ fontSize: fs(13), fontWeight: 'bold', color: '#111' }}>{d}</Text>
              </View>
            ))}
            <View style={{ borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF', paddingHorizontal: ps(14), paddingVertical: ps(9), borderRadius: ps(10), flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="add" size={fs(14)} color="#7E7E7E" />
              <Text style={{ fontSize: fs(13), fontWeight: 'bold', color: '#7E7E7E' }}> D-Day 추가</Text>
            </View>
          </View>
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#6366F1"
        title="날짜 이동"
        body={'화살표로 날짜를 하루씩 이동합니다.\n날짜 텍스트를 탭하면 캘린더가 열려 원하는 날로 바로 이동할 수 있어요.\n오늘 이후 날짜로는 이동할 수 없습니다.'}
      >
        <MockScreen>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ps(4) }}>
            <Ionicons name="chevron-back" size={fs(22)} color="#111" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ps(6) }}>
              <Text style={{ fontWeight: '700', fontSize: fs(15), color: '#111' }}>2025-05-18</Text>
              <Ionicons name="calendar-outline" size={fs(14)} color="#111" />
            </View>
            <Ionicons name="chevron-forward" size={fs(22)} color="#D3D3D3" />
          </View>
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#6366F1"
        title="오늘의 달성률 카드"
        body={"오늘 할 일 전체의 완료율이 원형 그래프로 표시돼요.\n목표 + 할 일 + 루틴 + 프로젝트를 합산한 비율입니다.\n설정에서 각 섹션을 켜고 끄면 달성률 계산에도 반영돼요."}
      >
        <MockScreen>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ps(14), backgroundColor: '#111', borderRadius: ps(14), padding: ps(14) }}>
            <View style={{ width: ps(60), height: ps(60), borderRadius: ps(30), borderWidth: 4, borderColor: '#6366F1', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: fs(13) }}>72%</Text>
            </View>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: fs(12) }}>달성률</Text>
              <Text style={{ color: '#fff', fontSize: fs(17), fontWeight: '700' }}>72% 완료</Text>
            </View>
          </View>
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#6366F1"
        title="캘린더에서 미완료 날짜 확인"
        body={'날짜 텍스트를 탭해 캘린더를 열면\n계획이 남아있는 날짜가 빨간 원으로 표시됩니다.\n상단에 "Unfinished plans remaining · N days"로 날짜 수도 표시돼요.'}
      >
        <MockScreen>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F5', borderRadius: ps(10), padding: ps(8), gap: ps(6), marginBottom: ps(10) }}>
            <Ionicons name="alert-circle" size={fs(14)} color="#FF3B30" />
            <Text style={{ fontSize: fs(12), color: '#FF3B30', fontWeight: '600' }}>Unfinished plans remaining · 3 days</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: ps(4), justifyContent: 'center' }}>
            {[
              { day: 12, type: 'normal' },
              { day: 13, type: 'incomplete' },
              { day: 14, type: 'today' },
              { day: 15, type: 'incomplete' },
              { day: 16, type: 'selected' },
            ].map(({ day, type }) => (
              <View key={day} style={{
                width: ps(36), height: ps(36), borderRadius: ps(18),
                justifyContent: 'center', alignItems: 'center',
                backgroundColor: type === 'incomplete' ? '#FF3B30' : type === 'selected' ? '#111' : 'transparent',
                borderWidth: type === 'today' ? 1.5 : 0,
                borderColor: '#111',
              }}>
                <Text style={{ fontSize: fs(13), fontWeight: '700', color: type === 'incomplete' || type === 'selected' ? '#fff' : '#111' }}>{day}</Text>
              </View>
            ))}
          </View>
        </MockScreen>
      </SectionCard>
    </ScrollView>
  );
}

// ─── 슬라이드 2: 홈탭 — Goals / Tasks ──────────────────────────

function Slide2() {
  return (
    <ScrollView style={c.scrollArea} contentContainerStyle={c.scrollContent} showsVerticalScrollIndicator={false}>
      <SectionCard
        color="#6366F1"
        title="목표 — 진도 기록"
        body={'목표 카드 오른쪽 − / + 버튼으로 오늘 한 양을 기록하세요.\n할당량을 모두 채우면 카드 테두리가 목표 색으로 변합니다.'}
      >
        <MockScreen>
          {/* 미완료 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: ps(13), borderRadius: ps(12), marginBottom: ps(8), borderWidth: 1, borderColor: '#EAEAEA' }}>
            <View style={{ width: ps(4), height: ps(32), borderRadius: 2, backgroundColor: '#6366F1', marginRight: ps(12) }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fs(14), fontWeight: 'bold', color: '#111' }}>영어 단어</Text>
              <Text style={{ fontSize: fs(11), color: '#7E7E7E' }}>30 / 50개</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ps(8), backgroundColor: '#F4F4F4', borderRadius: ps(20), paddingHorizontal: ps(10), paddingVertical: ps(4) }}>
              <Text style={{ fontWeight: '700', fontSize: fs(15) }}>−</Text>
              <Text style={{ fontWeight: '700', fontSize: fs(14), minWidth: ps(18), textAlign: 'center' }}>30</Text>
              <Text style={{ fontWeight: '700', fontSize: fs(15) }}>+</Text>
            </View>
          </View>
          {/* 완료 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: ps(13), borderRadius: ps(12), borderWidth: 2, borderColor: '#22C55E' }}>
            <View style={{ width: ps(4), height: ps(32), borderRadius: 2, backgroundColor: '#22C55E', marginRight: ps(12) }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fs(14), fontWeight: 'bold', color: '#111' }}>독서</Text>
              <Text style={{ fontSize: fs(11), color: '#7E7E7E' }}>30 / 30분</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ps(8), backgroundColor: '#F4F4F4', borderRadius: ps(20), paddingHorizontal: ps(10), paddingVertical: ps(4) }}>
              <Text style={{ fontWeight: '700', fontSize: fs(15), color: '#D3D3D3' }}>−</Text>
              <Text style={{ fontWeight: '700', fontSize: fs(14), minWidth: ps(18), textAlign: 'center' }}>30</Text>
              <Text style={{ fontWeight: '700', fontSize: fs(15), color: '#D3D3D3' }}>+</Text>
            </View>
            <Ionicons name="checkmark-circle" size={fs(26)} color="#22C55E" style={{ marginLeft: ps(10) }} />
          </View>
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#6366F1"
        title="할 일"
        body={'할 일을 탭하면 완료/미완료가 토글됩니다.\n완료되면 카드 테두리가 검정으로 변하고 체크 아이콘이 표시돼요.\n계획표 탭에서 + 버튼으로 추가할 수 있습니다.'}
      >
        <MockScreen>
          <ItemCard name="논문 초안 작성" completed={false} />
          <View style={{ height: ps(6) }} />
          <ItemCard name="단어 복습" completed={true} />
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#22C55E"
        title="루틴"
        body={'목표관리 탭에서 등록한 루틴이 해당 요일에 표시됩니다.\n탭하면 완료 처리되고 테두리가 검정으로 변해요.\n루틴은 요일 기반이라 다른 날짜로 이동할 수 없습니다.'}
      >
        <MockScreen>
          <ItemCard name="아침 스트레칭" completed={false} />
          <View style={{ height: ps(6) }} />
          <ItemCard name="저녁 독서 30분" completed={true} />
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#F97316"
        title="프로젝트"
        body={'목표관리 탭에서 등록한 프로젝트 단계가 표시됩니다.\n카드를 탭하면 다음 단계가 완료 처리돼요.\n모든 단계가 완료되면 프로젝트 색 테두리로 변합니다.'}
      >
        <MockScreen>
          {/* 미완료 프로젝트 */}
          <View style={{ backgroundColor: '#fff', padding: ps(13), borderRadius: ps(12), borderWidth: 1, borderColor: '#EAEAEA', marginBottom: ps(8) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: ps(8) }}>
              <View style={{ marginRight: ps(10) }}>
                <Ionicons name="ellipse-outline" size={fs(20)} color="#D3D3D3" />
              </View>
              <View style={{ width: ps(4), height: ps(20), borderRadius: 2, backgroundColor: '#F97316', marginRight: ps(12) }} />
              <Text style={{ fontSize: fs(13), fontWeight: '700', color: '#111', flex: 1 }}>졸업 논문</Text>
              <Text style={{ fontSize: fs(11), color: '#9CA3AF' }}>1/3</Text>
            </View>
            <View style={{ height: ps(3), backgroundColor: '#EAEAEA', borderRadius: 2, marginLeft: ps(34), overflow: 'hidden' }}>
              <View style={{ width: '33%', height: '100%', backgroundColor: '#F97316', borderRadius: 2 }} />
            </View>
            <Text style={{ fontSize: fs(11), color: '#7E7E7E', marginTop: ps(5), marginLeft: ps(34) }}>2단계: 본문 작성</Text>
          </View>
          {/* 완료 프로젝트 */}
          <View style={{ backgroundColor: '#fff', padding: ps(13), borderRadius: ps(12), borderWidth: 2, borderColor: '#10B981' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ marginRight: ps(10) }}>
                <Ionicons name="checkmark-circle" size={fs(20)} color="#10B981" />
              </View>
              <View style={{ width: ps(4), height: ps(20), borderRadius: 2, backgroundColor: '#10B981', marginRight: ps(12) }} />
              <Text style={{ fontSize: fs(13), fontWeight: '700', color: '#111', flex: 1 }}>독서 노트</Text>
              <Text style={{ fontSize: fs(11), color: '#10B981' }}>2/2</Text>
            </View>
          </View>
        </MockScreen>
      </SectionCard>
    </ScrollView>
  );
}

// ─── 슬라이드 3: 홈탭 — 미완료 재분배 ──────────────────────────

function Slide3() {
  return (
    <ScrollView style={c.scrollArea} contentContainerStyle={c.scrollContent} showsVerticalScrollIndicator={false}>
      <SectionCard
        color="#FF3B30"
        title="지난 날짜 잠금"
        body={'하루가 지나면 그날은 잠깁니다.\n잠긴 날의 + / − 버튼과 체크박스는 비활성화되어 기록을 수정할 수 없어요.\n그날 한 것은 달성률로 영구 기록됩니다.'}
      >
        <MockScreen>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: ps(8) }}>
            <Text style={{ fontWeight: '700', fontSize: fs(14) }}>2025-05-10</Text>
            <View style={{ backgroundColor: '#F3F4F6', borderRadius: ps(8), paddingHorizontal: ps(8), paddingVertical: ps(3) }}>
              <Text style={{ fontSize: fs(11), color: '#9CA3AF', fontWeight: '600' }}>잠금됨</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: ps(12), borderRadius: ps(12), borderWidth: 1, borderColor: '#EAEAEA', opacity: 0.75 }}>
            <View style={{ width: ps(4), height: ps(28), borderRadius: 2, backgroundColor: '#6366F1', marginRight: ps(12) }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fs(13), fontWeight: 'bold', color: '#111' }}>영어 단어</Text>
              <Text style={{ fontSize: fs(11), color: '#7E7E7E' }}>20 / 50개</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ps(8), backgroundColor: '#F4F4F4', borderRadius: ps(20), paddingHorizontal: ps(10), paddingVertical: ps(4) }}>
              <Ionicons name="remove" size={fs(14)} color="#D3D3D3" />
              <Text style={{ fontWeight: '700', fontSize: fs(14) }}>20</Text>
              <Ionicons name="add" size={fs(14)} color="#D3D3D3" />
            </View>
          </View>
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#FF3B30"
        title="못 끝낸 계획 재분배"
        body={'과거 날짜에 미완료 항목이 있으면 빨간 버튼이 표시됩니다.\n버튼을 탭하면 항목 목록이 나타나고, 각 항목을 탭해서 처리할 수 있어요.\n\n• 목표 → 일정 수정 화면 열림\n• 할 일 → 날짜 선택 후 해당 날짜로 이동\n• 루틴 → 요일 기반이라 이동 불가 (안내만)\n• 프로젝트 → 날짜 선택 후 해당 날짜로 이동\n\n재분배 후에도 그날의 달성률은 그대로 유지됩니다.'}
      >
        <MockScreen>
          <View style={{ backgroundColor: '#FF3B30', borderRadius: ps(12), paddingVertical: ps(11), paddingHorizontal: ps(16), flexDirection: 'row', alignItems: 'center', gap: ps(8), marginBottom: ps(10) }}>
            <Ionicons name="refresh-circle" size={fs(16)} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: fs(13) }}>미완료 항목 재분배</Text>
          </View>
          {/* Goal 항목 */}
          <View style={{ backgroundColor: '#F9F9F9', borderRadius: ps(12), padding: ps(12), flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA', marginBottom: ps(6) }}>
            <View style={{ width: ps(4), height: ps(28), borderRadius: 2, backgroundColor: '#6366F1', marginRight: ps(10) }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', fontSize: fs(13), color: '#111' }}>영어 단어</Text>
              <Text style={{ fontSize: fs(11), color: '#7E7E7E' }}>남은 양: 30개</Text>
            </View>
            <Ionicons name="calendar-outline" size={fs(16)} color="#7E7E7E" />
          </View>
          {/* Task 항목 */}
          <View style={{ backgroundColor: '#F9F9F9', borderRadius: ps(12), padding: ps(12), flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA', marginBottom: ps(6) }}>
            <View style={{ width: ps(4), height: ps(28), borderRadius: 2, backgroundColor: '#6366F1', marginRight: ps(10) }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', fontSize: fs(13), color: '#111' }}>논문 초안 작성</Text>
              <Text style={{ fontSize: fs(11), color: '#7E7E7E' }}>할 일 · 탭해서 다른 날짜로 이동</Text>
            </View>
            <Ionicons name="arrow-forward-outline" size={fs(16)} color="#7E7E7E" />
          </View>
          {/* Move All 버튼 */}
          <View style={{ backgroundColor: '#111', borderRadius: ps(10), padding: ps(10), alignItems: 'center', marginTop: ps(4) }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: fs(13) }}>전부 오늘로 이동</Text>
          </View>
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#FF3B30"
        title="달성률 보존"
        body={'재분배(미루기)를 해도 그날의 달성률은 변하지 않아요.\n\n예) 50% 달성 후 나머지를 미룬 날 → 계획표에 50%로 기록 유지\n\n못 끝낸 과거 항목이 있으면, 오늘 날짜 옆에 빨간 점이 표시됩니다.'}
      >
        <MockScreen>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ps(6) }}>
            <Ionicons name="chevron-back" size={fs(20)} color="#111" />
            <View style={{ position: 'relative' }}>
              <Text style={{ fontWeight: '700', fontSize: fs(15), color: '#111' }}>2025-05-18</Text>
              <View style={{ position: 'absolute', top: -2, right: -8, width: ps(7), height: ps(7), borderRadius: ps(4), backgroundColor: '#FF3B30' }} />
            </View>
            <Ionicons name="chevron-forward" size={fs(20)} color="#D3D3D3" />
          </View>
          <Sep />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ps(6), justifyContent: 'center' }}>
            <View style={{ width: ps(10), height: ps(10), borderRadius: ps(5), backgroundColor: '#FF3B30' }} />
            <Text style={{ fontSize: fs(12), color: '#FF3B30', fontWeight: '600' }}>과거에 미완료 항목이 있습니다</Text>
          </View>
        </MockScreen>
      </SectionCard>
    </ScrollView>
  );
}

// ─── 슬라이드 4: 계획표 탭 ──────────────────────────────────────

function Slide4() {
  return (
    <ScrollView style={c.scrollArea} contentContainerStyle={c.scrollContent} showsVerticalScrollIndicator={false}>
      <SectionCard
        color="#10B981"
        title="계획표 탭 — 일정"
        body={'날짜별 계획을 한눈에 볼 수 있는 탭입니다.\n상단 달력에서 날짜를 선택하면 아래에 해당 날짜 계획이 표시돼요.\n\n일정 / 타임라인 / 히스토리 탭으로 전환할 수 있고,\n설정에서 타임라인·히스토리 탭을 켜고 끌 수 있어요.'}
      >
        <MockScreen>
          <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: ps(12), padding: ps(3), marginBottom: ps(10) }}>
            {['일정', '타임라인', '히스토리'].map((t, i) => (
              <View key={t} style={{ flex: 1, paddingVertical: ps(8), borderRadius: ps(10), alignItems: 'center', backgroundColor: i === 0 ? '#111' : 'transparent' }}>
                <Text style={{ fontSize: fs(12), fontWeight: '600', color: i === 0 ? '#fff' : '#6B7280' }}>{t}</Text>
              </View>
            ))}
          </View>
          {/* 달력 마커 설명 */}
          <View style={{ flexDirection: 'row', gap: ps(4), justifyContent: 'center', marginBottom: ps(10) }}>
            {[
              { day: 12, border: '#22C55E', label: '100%', labelColor: '#16A34A' },
              { day: 13, border: '#FCD34D', label: '65%', labelColor: '#374151' },
              { day: 14, border: '#111', label: '오늘', labelColor: '#111', hasDday: true },
              { day: 15, border: null, label: '', labelColor: '' },
              { day: 16, bg: '#FFF0F0', label: 'OFF', labelColor: '#FF3B30', border: null },
            ].map(({ day, border, label, labelColor, bg, hasDday }: any) => (
              <View key={day} style={{ width: ps(38), height: ps(46), borderRadius: ps(10), justifyContent: 'center', alignItems: 'center', borderWidth: border ? 1.5 : 1, borderColor: border || '#EAEAEA', backgroundColor: bg || '#fff', position: 'relative' }}>
                {hasDday && <View style={{ position: 'absolute', top: ps(3), left: ps(3), width: ps(5), height: ps(5), borderRadius: ps(3), backgroundColor: '#FF3B30' }} />}
                <Text style={{ fontSize: fs(9), color: labelColor, fontWeight: '600' }}>{label}</Text>
                <Text style={{ fontWeight: '700', fontSize: fs(13), color: border === '#22C55E' ? '#16A34A' : '#111' }}>{day}</Text>
              </View>
            ))}
          </View>
          {[
            { color: '#22C55E', text: '초록 테두리 = 100% 달성' },
            { color: '#FCD34D', text: '노란 테두리 = 미완료 포함' },
            { color: '#FF3B30', text: '왼쪽 위 빨간 점 = D-Day 날짜' },
            { color: '#FFF0F0', text: '빨간 배경 = 하루 쉬기 설정' },
          ].map(({ color, text }) => (
            <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: ps(8), marginBottom: ps(3) }}>
              <View style={{ width: ps(10), height: ps(10), borderRadius: ps(3), backgroundColor: color, borderWidth: color === '#FFF0F0' ? 1 : 0, borderColor: '#FECACA' }} />
              <Text style={{ fontSize: fs(12), color: '#374151' }}>{text}</Text>
            </View>
          ))}
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#10B981"
        title="날짜별 계획 목록"
        body={'달력 아래 스크롤하면 선택한 날짜의 계획이 섹션별로 표시됩니다.\n\n• 목표 — 목표 이름 + 진행량 배지\n• 할 일 — 탭으로 완료 토글 + 삭제 가능\n• 루틴 — 완료 상태 표시 (읽기 전용)\n• 프로젝트 — 단계 완료 상태 표시 (읽기 전용)\n\n할 일은 계획표 탭에서 직접 추가·삭제할 수 있어요.'}
      >
        <MockScreen>
          <Text style={{ fontWeight: '700', fontSize: fs(15), color: '#111', marginBottom: ps(12) }}>2025-05-18 계획</Text>
          <Text style={{ fontWeight: 'bold', fontSize: fs(13), color: '#111', marginBottom: ps(6) }}>목표</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: ps(12), borderRadius: ps(12), borderWidth: 1, borderColor: '#EAEAEA', marginBottom: ps(10) }}>
            <View style={{ width: ps(4), height: ps(20), borderRadius: 2, backgroundColor: '#6366F1', marginRight: ps(12) }} />
            <Text style={{ flex: 1, fontWeight: '600', fontSize: fs(13), color: '#111' }}>영어 단어</Text>
            <View style={{ backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: ps(12), paddingHorizontal: ps(10), paddingVertical: ps(4) }}>
              <Text style={{ fontSize: fs(12), fontWeight: '600', color: '#111' }}>30 / 50개</Text>
            </View>
          </View>
          <Text style={{ fontWeight: 'bold', fontSize: fs(13), color: '#111', marginBottom: ps(6) }}>할 일</Text>
          <View style={{ flexDirection: 'row', gap: ps(8), marginBottom: ps(8) }}>
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#EAEAEA', borderRadius: ps(12), padding: ps(12) }}>
              <Text style={{ fontSize: fs(13), color: '#A0A0A0' }}>할 일 추가...</Text>
            </View>
            <View style={{ width: ps(48), height: ps(48), backgroundColor: '#111', borderRadius: ps(12), justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="add" size={fs(22)} color="#fff" />
            </View>
          </View>
          <ItemCard name="논문 초안 작성" completed={false} />
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#10B981"
        title="하루 쉬기 설정"
        body={'날짜를 선택하고 "하루 쉬기" 버튼을 탭하면\n목표 분배에서 제외되고 달력에 OFF로 표시됩니다.\n목표나 할 일이 있는 날은 하루 쉬기로 설정할 수 없어요.'}
      >
        <MockScreen>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#FF3B30', borderRadius: ps(20), paddingHorizontal: ps(16), paddingVertical: ps(8), alignSelf: 'flex-start', marginBottom: ps(8) }}>
            <Text style={{ fontSize: fs(13), fontWeight: 'bold', color: '#FF3B30' }}>하루 쉬기</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: ps(6) }}>
            <View style={{ width: ps(42), height: ps(48), borderRadius: ps(10), backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' }}>
              <Text style={{ fontSize: fs(13), fontWeight: '700', color: '#FF3B30' }}>20</Text>
              <Text style={{ fontSize: fs(9), color: '#FF3B30', fontWeight: '700' }}>OFF</Text>
            </View>
            <View style={{ width: ps(42), height: ps(48), borderRadius: ps(10), backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA' }}>
              <Text style={{ fontSize: fs(13), fontWeight: '700', color: '#111' }}>21</Text>
              <View style={{ height: 2, width: '55%', borderRadius: 2, backgroundColor: '#6366F1', marginTop: ps(2) }} />
            </View>
          </View>
        </MockScreen>
      </SectionCard>
    </ScrollView>
  );
}

// ─── 슬라이드 5: 계획표 — Timeline / History ────────────────────

function Slide5() {
  return (
    <ScrollView style={c.scrollArea} contentContainerStyle={c.scrollContent} showsVerticalScrollIndicator={false}>
      <SectionCard
        color="#8B5CF6"
        title="목표 타임라인"
        body={'계획표 탭 상단 타임라인 버튼을 탭하면\n등록된 모든 목표의 일정을 타임라인으로 볼 수 있어요.\n각 목표의 시작일~마감일이 가로 막대로 표시됩니다.\n\n설정에서 이 탭을 켜고 끌 수 있어요.'}
      >
        <MockScreen>
          <View style={{ flexDirection: 'row', gap: ps(6), marginBottom: ps(10) }}>
            {['일정', '타임라인', '히스토리'].map((t, i) => (
              <View key={t} style={{ flex: 1, paddingVertical: ps(7), borderRadius: ps(10), alignItems: 'center', backgroundColor: i === 1 ? '#111' : '#F3F4F6' }}>
                <Text style={{ fontSize: fs(11), fontWeight: '600', color: i === 1 ? '#fff' : '#6B7280' }}>{t}</Text>
              </View>
            ))}
          </View>
          {[
            { name: '영어 단어', color: '#6366F1', progress: 0.35 },
            { name: '독서', color: '#10B981', progress: 0.6 },
            { name: '알고리즘', color: '#F97316', progress: 0.1 },
          ].map(({ name, color, progress }) => (
            <View key={name} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: ps(8) }}>
              <Text style={{ width: ps(62), fontSize: fs(11), fontWeight: '700', color: '#111' }} numberOfLines={1}>{name}</Text>
              <View style={{ flex: 1, height: ps(14), backgroundColor: '#F3F4F6', borderRadius: ps(7), overflow: 'hidden' }}>
                <View style={{ width: '80%', height: '100%', backgroundColor: color + '40', borderRadius: ps(7), overflow: 'hidden' }}>
                  <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: color, borderRadius: ps(7) }} />
                </View>
              </View>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ps(6), marginTop: ps(4) }}>
            <View style={{ width: ps(10), height: ps(10), borderRadius: ps(2), backgroundColor: '#EF4444' }} />
            <Text style={{ fontSize: fs(10), color: '#6B7280' }}>빨간 세로선 = 오늘  |  진한 막대 = 완료  연한 막대 = 남은 일정</Text>
          </View>
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#F59E0B"
        title="학습 히스토리"
        body={'계획표 탭 히스토리 버튼을 탭하면\n지금까지의 학습 달성률 기록을 볼 수 있어요.\n일별 / 주별 / 월별 뷰로 전환 가능합니다.\n\n설정에서 이 탭을 켜고 끌 수 있어요.'}
      >
        <MockScreen>
          <View style={{ flexDirection: 'row', gap: ps(4), marginBottom: ps(10) }}>
            {['일별', '주별', '월별'].map((t, i) => (
              <View key={t} style={{ flex: 1, paddingVertical: ps(7), borderRadius: ps(10), alignItems: 'center', backgroundColor: i === 1 ? '#111' : '#F3F4F6' }}>
                <Text style={{ fontSize: fs(11), fontWeight: '600', color: i === 1 ? '#fff' : '#6B7280' }}>{t}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: ps(4), backgroundColor: '#FFFFFF', borderRadius: ps(12), padding: ps(10), borderWidth: 1, borderColor: '#EAEAEA' }}>
            {[
              { day: '일', pct: 0 },
              { day: '월', pct: 80 },
              { day: '화', pct: 100 },
              { day: '수', pct: 60 },
              { day: '목', pct: 45, today: true },
              { day: '금', pct: 0 },
              { day: '토', pct: 0 },
            ].map(({ day, pct, today }: any) => (
              <View key={day} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: fs(10), fontWeight: '600', color: today ? '#6366F1' : '#374151', marginBottom: ps(2) }}>{day}</Text>
                <View style={{ width: ps(18), height: ps(50), backgroundColor: '#F3F4F6', borderRadius: ps(9), overflow: 'hidden', justifyContent: 'flex-end' }}>
                  {pct > 0 && <View style={{ width: '100%', height: `${pct}%`, backgroundColor: pct === 100 ? '#22C55E' : '#6366F1', borderRadius: ps(9) }} />}
                </View>
                <Text style={{ fontSize: fs(8), fontWeight: '700', color: '#374151', marginTop: ps(3) }}>{pct > 0 ? `${pct}%` : '—'}</Text>
              </View>
            ))}
          </View>
        </MockScreen>
      </SectionCard>
    </ScrollView>
  );
}

// ─── 슬라이드 6: 목표관리 탭 — Goals ────────────────────────────

function Slide6() {
  return (
    <ScrollView style={c.scrollArea} contentContainerStyle={c.scrollContent} showsVerticalScrollIndicator={false}>
      <SectionCard
        color="#F59E0B"
        title="목표 추가"
        body={'+ 새 목표 버튼을 탭해 새 목표를 추가하세요.\n\n• 이름 / 총량 / 단위 / 마감일 / 반복 요일 입력\n• 균등 분배: 총량을 남은 날수에 균등하게 나눔\n• 직접 설정: 하루 최대량을 직접 지정'}
      >
        <MockScreen>
          <View style={{ backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: ps(10), padding: ps(12), marginBottom: ps(8) }}>
            <Text style={{ fontSize: fs(13), color: '#111' }}>영어 단어</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: ps(8), marginBottom: ps(8) }}>
            <View style={{ flex: 2, backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: ps(10), padding: ps(12) }}>
              <Text style={{ fontSize: fs(13), color: '#111' }}>1500</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: ps(10), padding: ps(12) }}>
              <Text style={{ fontSize: fs(13), color: '#A0A0A0' }}>개</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: ps(4), flexWrap: 'wrap', marginBottom: ps(8) }}>
            {['월', '화', '수', '목', '금'].map(d => (
              <View key={d} style={{ backgroundColor: d === '목' ? '#F3F4F6' : '#111', borderRadius: ps(8), paddingHorizontal: ps(8), paddingVertical: ps(4) }}>
                <Text style={{ fontSize: fs(11), fontWeight: '600', color: d === '목' ? '#374151' : '#fff' }}>{d}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: '#F4F4F4', borderRadius: ps(10), padding: ps(3) }}>
            <View style={{ flex: 1, backgroundColor: '#111', borderRadius: ps(8), padding: ps(8), alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: fs(13) }}>균등 분배</Text>
            </View>
            <View style={{ flex: 1, padding: ps(8), alignItems: 'center' }}>
              <Text style={{ color: '#A0A0A0', fontSize: fs(13) }}>직접 설정</Text>
            </View>
          </View>
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#F59E0B"
        title="일정 직접 편집"
        body={'목표 항목을 탭하면 달력이 열립니다.\n날짜를 탭 → 수량 입력 → 남은 양이 0이 되면 저장 가능해요.\n\n남은 양이 0이 아니면 저장할 수 없어요.'}
      >
        <MockScreen>
          <Text style={{ fontWeight: '700', fontSize: fs(13), marginBottom: ps(6) }}>일정 편집 — 영어 단어</Text>
          <View style={{ backgroundColor: '#FEF3C7', borderRadius: ps(10), padding: ps(10), alignItems: 'center', marginBottom: ps(8) }}>
            <Text style={{ fontWeight: '700', fontSize: fs(13), color: '#D97706' }}>남은 양: +20개 ← 저장 불가</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: ps(4), marginBottom: ps(8) }}>
            {[{ day: 15, amt: 50, done: true }, { day: 16, amt: 50, done: true }, { day: 17, amt: null }, { day: 18, amt: 70 }].map(({ day, amt, done }) => (
              <View key={day} style={{ flex: 1, height: ps(42), borderRadius: ps(10), justifyContent: 'center', alignItems: 'center', backgroundColor: amt ? '#6366F1' : '#F9F9F9' }}>
                <Text style={{ fontSize: fs(11), fontWeight: '700', color: amt ? '#fff' : '#999' }}>{day}</Text>
                {amt ? <Text style={{ fontSize: fs(11), color: '#fff' }}>{amt}</Text> : null}
              </View>
            ))}
          </View>
          <View style={{ backgroundColor: '#D3D3D3', borderRadius: ps(10), padding: ps(10), alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: fs(13) }}>저장 (남은 양 ≠ 0)</Text>
          </View>
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#F59E0B"
        title="완료 목표 & 순서 변경"
        body={'총량을 모두 채우면 완료 목표 영역으로 이동합니다.\n"완료 · N" 버튼으로 확인하고 되돌리거나 삭제할 수 있어요.\n\n순서 편집 버튼 → ▲▼로 목표 순서를 바꿀 수 있습니다.'}
      >
        <MockScreen>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ps(6), backgroundColor: '#FEF3C7', borderRadius: ps(12), padding: ps(10), marginBottom: ps(10) }}>
            <Ionicons name="trophy-outline" size={fs(15)} color="#D97706" />
            <Text style={{ fontSize: fs(13), fontWeight: '700', color: '#D97706' }}>완료 목표 · 2</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: ps(12), borderRadius: ps(12), borderWidth: 1, borderColor: '#EAEAEA', marginBottom: ps(6) }}>
            <View style={{ width: ps(4), height: ps(28), borderRadius: 2, backgroundColor: '#6366F1', marginRight: ps(12) }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: fs(13) }}>영어 단어</Text>
              <Text style={{ fontSize: fs(11), color: '#9CA3AF' }}>1500 / 1500개</Text>
            </View>
            <Ionicons name="refresh-outline" size={fs(17)} color="#6366F1" />
            <Ionicons name="trash-outline" size={fs(17)} color="#EF4444" style={{ marginLeft: ps(8) }} />
          </View>
          <Sep />
          {[{ name: '영어 단어', color: '#6366F1' }, { name: '독서', color: '#10B981' }].map(({ name, color }, idx) => (
            <View key={name} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: ps(10), borderRadius: ps(10), marginBottom: ps(4) }}>
              <View style={{ width: ps(4), height: ps(24), borderRadius: 2, backgroundColor: color, marginRight: ps(10) }} />
              <Text style={{ flex: 1, fontWeight: '700', fontSize: fs(13) }}>{name}</Text>
              <View style={{ gap: ps(2) }}>
                <View style={{ backgroundColor: '#fff', borderRadius: ps(5), width: ps(26), height: ps(24), justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="chevron-up" size={fs(14)} color={idx === 0 ? '#D1D5DB' : '#111'} />
                </View>
                <View style={{ backgroundColor: '#fff', borderRadius: ps(5), width: ps(26), height: ps(24), justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="chevron-down" size={fs(14)} color={idx === 1 ? '#D1D5DB' : '#111'} />
                </View>
              </View>
            </View>
          ))}
        </MockScreen>
      </SectionCard>
    </ScrollView>
  );
}

// ─── 슬라이드 7: 목표관리 탭 — Routines / Projects ──────────────

function Slide7() {
  return (
    <ScrollView style={c.scrollArea} contentContainerStyle={c.scrollContent} showsVerticalScrollIndicator={false}>
      <SectionCard
        color="#22C55E"
        title="루틴 탭"
        body={'반복 루틴을 등록하면 해당 요일 홈탭·계획표에 자동으로 표시됩니다.\n\n• 이름 / 마감일 / 반복 요일 / 색상 입력\n• 루틴 항목을 탭하면 달력에서 완료 기록을 확인할 수 있어요\n• 설정에서 루틴 탭을 켜고 끌 수 있어요'}
      >
        <MockScreen>
          <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: ps(12), padding: ps(3), marginBottom: ps(10) }}>
            {['목표', '루틴', '프로젝트'].map((t, i) => (
              <View key={t} style={{ flex: 1, paddingVertical: ps(7), borderRadius: ps(10), alignItems: 'center', backgroundColor: i === 1 ? '#111' : 'transparent' }}>
                <Text style={{ fontSize: fs(11), fontWeight: '600', color: i === 1 ? '#fff' : '#6B7280' }}>{t}</Text>
              </View>
            ))}
          </View>
          {[{ name: '아침 스트레칭', days: '월, 수, 금', color: '#22C55E' }, { name: '저녁 독서', days: '월~일', color: '#6366F1' }].map(({ name, days, color }) => (
            <View key={name} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: ps(12), borderRadius: ps(12), borderWidth: 1, borderColor: '#EAEAEA', marginBottom: ps(6) }}>
              <View style={{ width: ps(12), height: ps(12), borderRadius: ps(6), backgroundColor: color, marginRight: ps(10) }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fs(13), fontWeight: 'bold', color: '#111' }}>{name}</Text>
                <Text style={{ fontSize: fs(11), color: '#7E7E7E' }}>{days}</Text>
              </View>
              <Ionicons name="pencil-outline" size={fs(18)} color="#7E7E7E" />
              <Ionicons name="trash-outline" size={fs(18)} color="#111" style={{ marginLeft: ps(8) }} />
            </View>
          ))}
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#F97316"
        title="프로젝트 탭"
        body={'프로젝트와 단계를 등록할 수 있어요.\n\n• 이름 / 마감일 / 색상 / 단계 목록 입력\n• 각 단계에 날짜를 배정하면 해당 날짜 홈탭·계획표에 표시됩니다\n• 설정에서 프로젝트 탭을 켜고 끌 수 있어요'}
      >
        <MockScreen>
          <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: ps(12), padding: ps(3), marginBottom: ps(10) }}>
            {['목표', '루틴', '프로젝트'].map((t, i) => (
              <View key={t} style={{ flex: 1, paddingVertical: ps(7), borderRadius: ps(10), alignItems: 'center', backgroundColor: i === 2 ? '#111' : 'transparent' }}>
                <Text style={{ fontSize: fs(11), fontWeight: '600', color: i === 2 ? '#fff' : '#6B7280' }}>{t}</Text>
              </View>
            ))}
          </View>
          <View style={{ backgroundColor: '#fff', padding: ps(12), borderRadius: ps(12), borderWidth: 1, borderColor: '#EAEAEA' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: ps(8) }}>
              <View style={{ width: ps(12), height: ps(12), borderRadius: ps(6), backgroundColor: '#F97316', marginRight: ps(10) }} />
              <Text style={{ flex: 1, fontSize: fs(13), fontWeight: 'bold', color: '#111' }}>졸업 논문</Text>
              <Text style={{ fontSize: fs(11), color: '#9CA3AF' }}>마감: 2025-08-31</Text>
            </View>
            <View style={{ height: ps(6), backgroundColor: '#F3F4F6', borderRadius: ps(3), overflow: 'hidden', marginBottom: ps(8) }}>
              <View style={{ width: '33%', height: '100%', backgroundColor: '#F97316', borderRadius: ps(3) }} />
            </View>
            {['자료 조사', '본문 작성', '최종 검토'].map((step: string, i: number) => (
              <View key={step} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: ps(4) }}>
                <Ionicons name={i === 0 ? 'checkmark-circle' : 'ellipse-outline'} size={fs(16)} color={i === 0 ? '#F97316' : '#D3D3D3'} style={{ marginRight: ps(8) }} />
                <Text style={{ fontSize: fs(12), color: i === 0 ? '#9CA3AF' : '#111' }}>Step {i + 1}. {step}</Text>
                {i > 0 && <Text style={{ fontSize: fs(10), color: '#9CA3AF', marginLeft: 'auto' }}>2025-0{6 + i}-{10 + i * 5}</Text>}
              </View>
            ))}
          </View>
        </MockScreen>
      </SectionCard>
    </ScrollView>
  );
}

// ─── 슬라이드 8: 설정 ────────────────────────────────────────────

function Slide8() {
  return (
    <ScrollView style={c.scrollArea} contentContainerStyle={c.scrollContent} showsVerticalScrollIndicator={false}>
      <SectionCard
        color="#6366F1"
        title="하루 종료 시간"
        body={'이 시각 이전까지는 전날 날짜로 취급됩니다.\n야간 공부 루틴에 유용해요.\n\n예) 새벽 3시 설정 → 오전 3시 이전엔 어제 날짜로 계획 표시'}
      >
        <MockScreen>
          <View style={{ backgroundColor: '#111', borderRadius: ps(10), padding: ps(10), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ps(4) }}>
            <Text style={{ color: '#fff', fontSize: fs(13) }}>자정 (00:00)</Text>
            <Ionicons name="checkmark" size={fs(14)} color="#fff" />
          </View>
          {['새벽 1시', '새벽 2시', '새벽 3시 (야간 루틴 추천)', '새벽 4시'].map(t => (
            <View key={t} style={{ backgroundColor: '#F3F4F6', borderRadius: ps(10), padding: ps(10), marginBottom: ps(4) }}>
              <Text style={{ fontSize: fs(13), color: '#374151' }}>{t}</Text>
            </View>
          ))}
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#6366F1"
        title="탭 표시 설정"
        body={'설정에서 각 탭·섹션의 표시 여부를 개별적으로 조절할 수 있어요.\n\n계획표 탭 표시\n• 목표 타임라인 탭\n• 학습 히스토리 탭\n\n목표관리 탭 표시\n• 루틴 탭\n• 프로젝트 탭\n\n홈 탭 표시\n• 루틴 섹션\n• 프로젝트 섹션\n\n※ 숨기면 달성률 계산에서도 자동 제외됩니다.'}
      >
        <MockScreen>
          {[
            { icon: 'git-branch-outline' as const, color: '#8B5CF6', label: '목표 타임라인', on: true },
            { icon: 'bar-chart-outline' as const, color: '#F59E0B', label: '학습 히스토리', on: false },
            { icon: 'repeat-outline' as const, color: '#22C55E', label: '루틴', on: true },
            { icon: 'folder-open-outline' as const, color: '#F97316', label: '프로젝트', on: true },
          ].map(({ icon, color, label, on }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: ps(8), borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
              <View style={{ width: ps(30), height: ps(30), borderRadius: ps(8), backgroundColor: color + '18', justifyContent: 'center', alignItems: 'center', marginRight: ps(12) }}>
                <Ionicons name={icon} size={fs(16)} color={color} />
              </View>
              <Text style={{ flex: 1, fontSize: fs(13), fontWeight: '500', color: '#111' }}>{label}</Text>
              <View style={{ width: ps(42), height: ps(24), borderRadius: ps(12), backgroundColor: on ? '#111' : '#E5E7EB', justifyContent: 'center', paddingHorizontal: ps(3) }}>
                <View style={{ width: ps(18), height: ps(18), borderRadius: ps(9), backgroundColor: '#fff', alignSelf: on ? 'flex-end' : 'flex-start' }} />
              </View>
            </View>
          ))}
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#6366F1"
        title="기기 간 동기화"
        body={'설정 → "기기 동기화 설정"을 탭해 계정을 만들거나 로그인하세요.\n로그인하면 모든 기기에서 실시간으로 데이터가 동기화됩니다.\n\n앱 삭제 후 재설치해도 로그인하면 모든 데이터가 복원돼요.\n1년 이상 지난 데이터는 자동 정리됩니다.'}
      >
        <MockScreen>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ps(10), backgroundColor: '#fff', padding: ps(12), borderRadius: ps(12), borderWidth: 1, borderColor: '#EAEAEA', marginBottom: ps(8) }}>
            <View style={{ width: ps(34), height: ps(34), borderRadius: ps(10), backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="cloud-outline" size={fs(18)} color="#6366F1" />
            </View>
            <Text style={{ flex: 1, fontSize: fs(13) }}>기기 동기화 설정</Text>
            <Text style={{ fontSize: fs(12), color: '#9CA3AF' }}>로그인 필요 ›</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ps(10), backgroundColor: '#fff', padding: ps(12), borderRadius: ps(12), borderWidth: 1, borderColor: '#EAEAEA' }}>
            <View style={{ width: ps(34), height: ps(34), borderRadius: ps(10), backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="cloud-done-outline" size={fs(18)} color="#10B981" />
            </View>
            <View>
              <Text style={{ fontSize: fs(11), color: '#9CA3AF' }}>user@email.com</Text>
              <Text style={{ fontSize: fs(12), fontWeight: '600', color: '#10B981' }}>연결됨 · 동기화 중</Text>
            </View>
          </View>
        </MockScreen>
      </SectionCard>

      <SectionCard
        color="#6366F1"
        title="이 가이드 다시 보기"
        body={'설정 탭 → "사용 가이드 다시 보기"를 탭하면\n언제든 이 안내를 다시 확인할 수 있어요.'}
      />
    </ScrollView>
  );
}

// ─── 슬라이드 메타 ──────────────────────────────────────────────

type SlideMeta = {
  id: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  iconColor: string;
  bg: string;
  title: string;
  Component: React.FC;
};

const SLIDES: SlideMeta[] = [
  { id: '1', icon: 'home-outline',           iconColor: '#6366F1', bg: '#EEF2FF', title: '홈 (1) — 기본 화면',              Component: Slide1 },
  { id: '2', icon: 'home-outline',           iconColor: '#6366F1', bg: '#EEF2FF', title: '홈 (2) — 목표 / 할 일 / 루틴 / 프로젝트', Component: Slide2 },
  { id: '3', icon: 'refresh-circle-outline', iconColor: '#EF4444', bg: '#FEF2F2', title: '홈 (3) — 미완료 재분배',           Component: Slide3 },
  { id: '4', icon: 'calendar-outline',       iconColor: '#10B981', bg: '#ECFDF5', title: '계획표 (1) — 일정',               Component: Slide4 },
  { id: '5', icon: 'calendar-outline',       iconColor: '#8B5CF6', bg: '#F5F3FF', title: '계획표 (2) — 타임라인 / 히스토리', Component: Slide5 },
  { id: '6', icon: 'trophy-outline',         iconColor: '#F59E0B', bg: '#FFFBEB', title: '목표관리 (1) — 목표',             Component: Slide6 },
  { id: '7', icon: 'layers-outline',         iconColor: '#F97316', bg: '#FFF7ED', title: '목표관리 (2) — 루틴 / 프로젝트',  Component: Slide7 },
  { id: '8', icon: 'settings-outline',       iconColor: '#6366F1', bg: '#EEF2FF', title: '설정',                            Component: Slide8 },
];

// ─── 메인 컴포넌트 ──────────────────────────────────────────────

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState(0);

  const goTo = (index: number) => setCurrent(index);

  const handleNext = () => {
    if (current < SLIDES.length - 1) goTo(current + 1);
    else handleDone();
  };

  const handleDone = async () => {
    await AsyncStorage.setItem('onboardingDone', 'true');
    onDone();
  };

  const slide = SLIDES[current];
  const SlideComponent = slide.Component;

  return (
    <View style={s.root}>
      {/* 헤더 */}
      <View style={s.header}>
        <View style={[s.iconCard, { backgroundColor: slide.bg }]}>
          <Ionicons name={slide.icon} size={ps(26)} color={slide.iconColor} />
        </View>
        <View style={{ flex: 1, marginLeft: ps(14) }}>
          <Text style={s.stepLabel}>{current + 1} / {SLIDES.length}</Text>
          <Text style={s.headerTitle} numberOfLines={1}>{slide.title}</Text>
        </View>
        <TouchableOpacity style={s.skipBtn} onPress={handleDone}>
          <Text style={s.skipText}>닫기</Text>
        </TouchableOpacity>
      </View>

      {/* 도트 인디케이터 */}
      <View style={s.dots}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View style={[s.dot, i === current && s.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* 슬라이드 콘텐츠 */}
      <SlideComponent />

      {/* 하단 버튼 */}
      <View style={s.footer}>
        {current > 0 && (
          <TouchableOpacity style={s.backBtn} onPress={() => goTo(current - 1)}>
            <Ionicons name="arrow-back" size={ps(18)} color="#6B7280" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.nextBtn, { flex: 1 }]} onPress={handleNext} activeOpacity={0.85}>
          <Text style={s.nextBtnText}>
            {current < SLIDES.length - 1 ? '다음 →' : '완료 →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#FFFFFF', paddingTop: ps(56) },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: ps(20), marginBottom: ps(14) },
  iconCard:    { width: ps(48), height: ps(48), borderRadius: ps(14), justifyContent: 'center', alignItems: 'center' },
  stepLabel:   { fontSize: fs(11), color: '#9CA3AF', fontWeight: '600', marginBottom: 2 },
  headerTitle: { fontSize: fs(16), fontWeight: 'bold', color: '#111111' },
  skipBtn:     { paddingHorizontal: ps(12), paddingVertical: ps(6) },
  skipText:    { color: '#9CA3AF', fontSize: fs(13) },
  dots:        { flexDirection: 'row', gap: ps(5), paddingHorizontal: ps(20), marginBottom: ps(10), flexWrap: 'wrap' },
  dot:         { width: ps(6), height: ps(6), borderRadius: ps(3), backgroundColor: '#E5E7EB' },
  dotActive:   { width: ps(18), backgroundColor: '#6366F1', borderRadius: ps(3) },
  footer:      { flexDirection: 'row', gap: ps(10), paddingHorizontal: ps(20), paddingBottom: ps(40), paddingTop: ps(12), backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  backBtn:     { width: ps(50), height: ps(52), borderRadius: ps(14), backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  nextBtn:     { height: ps(52), backgroundColor: '#111111', borderRadius: ps(14), justifyContent: 'center', alignItems: 'center' },
  nextBtnText: { color: '#FFFFFF', fontSize: fs(16), fontWeight: 'bold' },
});

const c = StyleSheet.create({
  scrollArea:    { flex: 1 },
  scrollContent: { paddingHorizontal: ps(16), paddingBottom: ps(24) },

  card:       { backgroundColor: '#fff', borderRadius: ps(14), padding: ps(16), marginBottom: ps(12), borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardHead:   { flexDirection: 'row', alignItems: 'center', marginBottom: ps(8) },
  cardDot:    { width: ps(8), height: ps(8), borderRadius: ps(4), marginRight: ps(8) },
  cardTitle:  { fontSize: fs(15), fontWeight: '700', color: '#111' },
  cardBody:   { fontSize: fs(13.5), color: '#374151', lineHeight: fs(13.5) * 1.65 },
  previewWrap:{ marginTop: ps(12) },

  mockScreen: { backgroundColor: '#FAFAFA', borderRadius: ps(12), borderWidth: 1.5, borderColor: '#E5E7EB', padding: ps(12), marginTop: ps(8) },

  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: ps(12), borderRadius: ps(12), marginBottom: ps(6), borderWidth: 1, borderColor: '#EAEAEA' },

  sep: { height: 1, backgroundColor: '#F3F4F6', marginVertical: ps(8) },
  lbl: { fontSize: fs(11), color: '#9CA3AF', fontWeight: '600', marginBottom: ps(4) },
});
