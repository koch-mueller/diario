import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './modules/auth/auth.module';
import { BudgetPlannerModule } from './modules/budget-planner/budget-planner.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { HouseholdsModule } from './modules/households/households.module';
import { ShoppingListModule } from './modules/shopping-list/shopping-list.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TranslationModule } from './modules/translation/translation.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

/**
 * Konfiguriert die globalen Module und Infrastrukturabhängigkeiten der Anwendung.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'diario'),
        autoLoadEntities: true,
        synchronize:
          configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),
    TasksModule,
    AuthModule,
    HouseholdsModule,
    ShoppingListModule,
    BudgetPlannerModule,
    CalendarModule,
    TranslationModule,
    RealtimeModule,
  ],
})
export class AppModule {}
