import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from 'src/categories/category.entity';
import { AppConfigModule } from 'src/config/config.module';

@Module({
    imports: [
        AppConfigModule,
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: async (configuration: ConfigService) => ({
                type: 'postgres',
                host: configuration.get<string>('database.host'),
                port: configuration.get<number>('database.port'),
                username: configuration.get<string>('database.username'),
                password: configuration.get<string>('database.password'),
                database: configuration.get<string>('database.name'),
                entities: [Category],
                synchronize: true,
            }),
        })
    ]
})
export class DatabaseModule {}
