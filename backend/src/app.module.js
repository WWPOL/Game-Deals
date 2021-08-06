"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.AppModule = void 0;
var common_1 = require("@nestjs/common");
var typeorm_1 = require("@nestjs/typeorm");
var app_controller_1 = require("~/app.controller");
var app_service_1 = require("~/app.service");
var config_1 = require("~/config");
var user_1 = require("~/models/user");
var game_1 = require("~/models/game");
var deal_1 = require("~/models/deal");
var CFG = config_1.EnvConfig();
var AppModule = /** @class */ (function () {
    function AppModule() {
    }
    AppModule = __decorate([
        common_1.Module({
            imports: [
                typeorm_1.TypeOrmModule.forRoot({
                    type: "postgres",
                    host: CFG.db.host,
                    port: CFG.db.port,
                    username: CFG.db.username,
                    password: CFG.db.password,
                    database: CFG.db.database,
                    entities: [
                        user_1.User,
                        game_1.Game,
                        deal_1.Deal,
                    ],
                    synchronize: CFG.db.autoMigrate
                }),
            ],
            controllers: [
                app_controller_1.AppController,
            ],
            providers: [
                app_service_1.AppService,
            ]
        })
    ], AppModule);
    return AppModule;
}());
exports.AppModule = AppModule;
