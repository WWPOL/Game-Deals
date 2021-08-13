import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { EnvConfig } from "./config";
import { User } from "./models/user";
import { Game } from "./models/game";
import { Deal } from "./models/deal";

const CFG = EnvConfig();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: CFG.db.host,
      port: CFG.db.port,
      username: CFG.db.username,
      password: CFG.db.password,
      database: CFG.db.database,
      entities: [
        User,
        Game,
        Deal,
      ],
      synchronize: CFG.db.autoMigrate,
    }),
  ],
  controllers: [
    AppController,
  ],
  providers: [
    AppService,
  ],
})
export class AppModule {}
