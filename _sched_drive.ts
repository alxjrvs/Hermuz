import { runMigrations, getDueJobs, updateJob } from '@hermuz/db'
import { enqueueJob } from '~/services/schedulerService'
import { registerJobHandler, getJobHandler } from '~/services/jobRegistry'

runMigrations()
let ran = 0
registerJobHandler('TEST_OK', async () => { ran++ })
registerJobHandler('TEST_FAIL', async () => { throw new Error('boom') })
await enqueueJob('TEST_OK', new Date(Date.now() - 1000).toISOString())
await enqueueJob('TEST_FAIL', new Date(Date.now() - 1000).toISOString())
await enqueueJob('TEST_OK', new Date(Date.now() + 3600_000).toISOString())
const due = await getDueJobs(new Date().toISOString())
console.log('due now:', due.map(j => j.kind).sort().join(','))
for (const job of due) {
  const h = getJobHandler(job.kind)!
  try { await h({} as any, job); await updateJob(job.id, { status: 'DONE' }) }
  catch (e) { await updateJob(job.id, { status: 'PENDING', attempts: job.attempts + 1, lastError: String(e), runAt: new Date(Date.now()+300000).toISOString() }) }
}
const stillDue = await getDueJobs(new Date().toISOString())
console.log('TEST_OK ran count:', ran)
console.log('still due after tick:', stillDue.length)
console.log('PASS:', ran === 1 && stillDue.length === 0)
