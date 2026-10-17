"use client";

import { Card, Col, Row, Statistic } from "antd";

type Props = {
  today: number;
  week: number;
  month: number;
  byMethod: Record<string, number>;
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function RevenueSummary({ today, week, month, byMethod }: Props) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Statistic title="Today" value={inr(today)} /></Col>
        <Col xs={12} md={6}><Statistic title="This week" value={inr(week)} /></Col>
        <Col xs={12} md={6}><Statistic title="This month" value={inr(month)} /></Col>
        <Col xs={24} md={6}>
          <Statistic
            title="Month by method"
            value={Object.entries(byMethod)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => `${k.toUpperCase()} ${inr(v)}`)
              .join(" · ") || "-"}
            valueStyle={{ fontSize: 14 }}
          />
        </Col>
      </Row>
    </Card>
  );
}