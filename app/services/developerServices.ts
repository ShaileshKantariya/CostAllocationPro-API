import { prisma } from '../client/prisma';

class DeveloperService {

    async deleteCompanyFromDb(companyId: string) {

        const companyRoles = await prisma.companyRole.findMany({
            where: {
                companyId
            }
        });

        await prisma.role.deleteMany({
            where: {
                id: {
                    in: companyRoles.map((e) => {
                        return e.roleId
                    })
                },
                roleName: {
                    notIn: ['Admin', 'Company Admin']
                }
            }
        })

        await prisma.user.deleteMany({
            where: {
                id: {
                    in: companyRoles.map((e) => {
                        return e.userId as string
                    })
                }
            }
        })

        await prisma.companyRole.deleteMany({
            where: {
                companyId
            }
        });

        await prisma.timeActivities.deleteMany({
            where: {
                companyId
            }
        });

        await prisma.timeSheets.deleteMany({
            where: {
                companyId
            }
        });


        const getEmployeeCostField = await prisma.employeeCostField.findMany({
            where: {
                companyId
            }
        })

        await prisma.employeeCostValue.deleteMany({
            where: {
                employeeFieldId: {
                    in: getEmployeeCostField.map((e) => {
                        return e.id
                    })
                }
            }
        });

        await prisma.employeeCostField.deleteMany({
            where: {
                companyId
            }
        });

        await prisma.field.deleteMany({
            where: {
                companyId
            }
        });

        await prisma.configurationSection.deleteMany({
            where: {
                companyId
            }
        });

        await prisma.configuration.deleteMany({
            where: {
                companyId
            }
        });

        await prisma.journal.deleteMany({
            where: {
                companyId
            }
        });

        await prisma.payPeriod.deleteMany({
            where: {
                companyId
            }
        });

        await prisma.company.delete({
            where: {
                id: companyId
            }
        })
    }

}


export default new DeveloperService()