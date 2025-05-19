import { ActivityType } from 'discord.js'
import { client } from 'robo.js'
export default () => {
  client.user?.setActivity({
    name: '✨ Built with Robo.js',
    type: ActivityType.Custom,
    url: 'https:
  })
}
