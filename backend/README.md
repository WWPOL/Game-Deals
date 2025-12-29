# Backend
Backend.

# Table Of Contents
- [Development](#development)

# Development
## Model Schema
Uses [Ent](https://entgo.io/) to manage models.

Edit files in [`ent/schema`](./ent/schema/) to change models.

To create new models:

``` shell
go run -mod=mod entgo.io/ent/cmd/ent new <NAME>
```

After any change to `ent/schema/` make sure to rerun generate:

``` shell
go generate ./ent
```

