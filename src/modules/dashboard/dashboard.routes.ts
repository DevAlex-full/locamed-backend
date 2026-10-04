import { FastifyInstance } from 'fastify'
import { prisma } from '@/config/database'

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/stats', async (request, reply) => {
    const { companyId } = request.user as any // Temporarily any for speed, will fix to AuthenticatedUser

    const [activeReservations, totalClients, totalChairs] = await Promise.all([
      prisma.reservation.count({ where: { company_id: companyId, status: 'active' } }),
      prisma.client.count({ where: { company_id: companyId, deleted_at: null } }),
      prisma.chair.count({ where: { company_id: companyId, deleted_at: null } }),
    ])

    const totalRevenue = await prisma.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { company_id: companyId, status: 'paid' }
    })

    return {
      activeReservations,
      totalClients,
      totalChairs,
      revenue: totalRevenue._sum.amount || 0
    }
  })
}
