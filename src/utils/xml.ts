import { Task, Plugin } from '../types';

export function formatPluginAsXml(plugin: Plugin, commandName: string, commandParams: Record<string, any>, description: string): string {
  const paramsXml = Object.entries(commandParams)
    .map(([paramName, defaultValue]) => `<${paramName}>${defaultValue}</${paramName}>`)
    .join('');
  return `<TASK> <PLUGIN>${plugin.name}</PLUGIN> <COMMAND>${commandName}</COMMAND> <PARAMS>${paramsXml}</PARAMS> <DESCRIPTION>${description}</DESCRIPTION> </TASK>`;
}

export function formatTaskAsXml(task: Task): string {
  if (task.plugin && task.command) {
    return formatPluginAsXml(task.plugin, task.command.name, task.command.params, task.description);
  }
  return `<TASK> <DESCRIPTION>${task.description}</DESCRIPTION> </TASK>`;
} 
