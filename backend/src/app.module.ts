import { Module } from "@nestjs/common";
import {
  ConfigModule,
  ConfigService,
} from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import {
  DBConfig,
  EnvConfig,
} from "./config";
import { User } from "./models/user";
import { Game } from "./models/game";
import { Deal } from "./models/deal";


@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ ConfigModule ],
      useFactory: (cfg: ConfigService) => ({
        ...cfg.get<DBConfig>("db"),
        type: "postgres",
        entities: [
          User,
          Game,
          Deal,
        ],
      }),
      inject: [ ConfigModule.forRoot({
        load: [ EnvConfig ],
      }) ],
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
