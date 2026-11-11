import { Column, Link, Row, Section, Text } from "react-email";
import {
  Actions,
  Button,
  EmailLayout,
  Lead,
  NotifyFooter,
  Tag,
  Thumb,
  Title,
  styles,
} from "../src/components";
import { asset, money } from "../src/config";
import { color } from "../src/theme";

/* To a follower: a shop they follow listed something new. */

export type NewFromShopEmailProps = {
  shop: { name: string; url: string };
  items: { title: string; price: number; imageUrl?: string | null; url: string }[];
};

export const newFromShopSubject = ({ shop, items }: NewFromShopEmailProps) =>
  items.length === 1
    ? `New at ${shop.name}: ${items[0]!.title}`
    : `${shop.name} listed ${items.length} new things`;

/** Two across. More than six and the rest are behind "See the shop". */
const shown = 6;

export default function NewFromShopEmail({ shop, items }: NewFromShopEmailProps) {
  const rows: (typeof items)[] = [];
  for (let i = 0; i < Math.min(items.length, shown); i += 2) rows.push(items.slice(i, i + 2));
  const more = items.length - shown;

  return (
    <EmailLayout
      preview={items
        .slice(0, 3)
        .map((item) => `${item.title} ${money(item.price)}`)
        .join(" · ")}
      footer={<NotifyFooter reason="a shop you follow lists something" />}
    >
      <Tag tone="pink">Just listed</Tag>
      <Title>
        {items.length === 1 ? `New at ${shop.name}` : `${items.length} new things at ${shop.name}`}
      </Title>
      <Lead>You follow {shop.name}, so you're seeing these first.</Lead>

      <Section style={{ marginTop: 20 }}>
        {rows.map((row, r) => (
          <Row key={r}>
            {row.map((item, i) => (
              <Column
                key={item.url}
                style={{
                  width: "50%",
                  verticalAlign: "top",
                  padding: i === 0 ? "0 6px 16px 0" : "0 0 16px 6px",
                }}
              >
                <Link href={item.url} style={{ textDecoration: "none" }}>
                  <Thumb src={item.imageUrl} alt={item.title} size={240} fluid />
                  <Text style={{ ...styles.listingTitle, fontSize: 15, margin: "10px 0 0" }}>
                    {item.title}
                  </Text>
                  <Text style={price}>{money(item.price)}</Text>
                </Link>
              </Column>
            ))}
            {row.length === 1 && <Column style={{ width: "50%" }} />}
          </Row>
        ))}
      </Section>

      <Actions>
        <Button href={shop.url}>{more > 0 ? `See all ${items.length}` : "See the shop"}</Button>
      </Actions>
    </EmailLayout>
  );
}

NewFromShopEmail.PreviewProps = {
  shop: { name: "Maya's Closet", url: "https://maya.broresell.com" },
  items: [
    { title: "Linen wrap dress", price: 24, imageUrl: asset("dress.png"), url: "https://maya.broresell.com/linen-wrap-dress" },
    { title: "Pink cotton sweater", price: 32, imageUrl: asset("sweater.png"), url: "https://maya.broresell.com/pink-sweater" },
    { title: "Brass desk lamp", price: 45, imageUrl: asset("lamp.png"), url: "https://maya.broresell.com/brass-lamp" },
    { title: "Canvas market tote", price: 15, imageUrl: asset("tote.png"), url: "https://maya.broresell.com/canvas-tote" },
  ],
} satisfies NewFromShopEmailProps;

const price = {
  margin: "2px 0 0",
  fontSize: 15,
  lineHeight: "20px",
  fontWeight: 500,
  color: color.textMuted,
};
