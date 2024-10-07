import { prisma } from '../client/prisma';
import { migrations } from '../constants/migrations';
import { logger } from '../utils/logger';
import { migrationService } from './migration.service';

export async function runMigration() {
    logger.info('Migration started');
    for(let i = 0; i < migrations.length; i++) {
        let migrationId: string = '';
        const getMigration = await prisma.migrations.findFirst({
            where: {
                name: migrations[i]
            }
        });
        if(getMigration) {
            migrationId = getMigration.id;
        }
        try {
    
            if(!getMigration) {
                logger.info('Running Migration ' + migrations[i]);
                const createMigration = await prisma.migrations.create({
                    data: {
                        name: migrations[i]
                    }
                });
                migrationId = createMigration.id;
                await migrationService[migrations[i]]()
                await prisma.migrations.update({
                    where: {
                        id: migrationId
                    },
                    data: {
                        isCompleted: true
                    }
                })
            }
        } catch (error) {
            logger.error(`Error while running migration`, error);
            await prisma.migrations.update({
                where: {
                    id: migrationId
                },
                data: {
                    isFailed: true
                }
            })
        }

    }
    logger.info('Migration completed');
}