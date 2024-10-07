import { getSkipRecordCount } from '../utils/utils';
import { PrismaClient } from '@prisma/client';

const prisma: any = new PrismaClient();

export async function getPaginationData(schema: string, searchEntity: any, pagination: Pagination, otherParameters?: any) {

    let mainEntity = {
        search: {
            ...searchEntity
        }
    }

    if(otherParameters) {
        mainEntity = {
            search: {
                ...searchEntity
            },
            ...otherParameters
        }
    }
    
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;

    const skip = getSkipRecordCount(page, limit);

    const orderBy: any[] = [
        {
            id: 'desc'
        }
    ];

    if(pagination.type && pagination.sort) {
        orderBy.push({
            [pagination.type]: pagination.sort,
        })
    }

    const data = await prisma[schema].findMany({
        ...mainEntity,
        orderBy,
        skip
    });

    const count = await prisma[schema].count({
        where: {
            ...searchEntity
        }
    })

    return {
        content: data,
        count: count
    }

}


interface Pagination {
    page?: number
    limit?: number
    type?: string
    sort?: 'desc' | 'asc'
}