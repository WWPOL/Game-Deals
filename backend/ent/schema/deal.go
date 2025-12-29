package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

// Deal holds the schema definition for the Deal entity.
type Deal struct {
	ent.Schema
}

// Fields of the Deal.
func (Deal) Fields() []ent.Field {
	return []ent.Field{
    field.String("name"),
		field.Time("expires_at"),
		field.Float("price"),
    field.String("link"),
	}
}

// Edges of the Deal.
func (Deal) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("image", Image.Type),
    edge.To("created_by", User.Type),
	}
}
