/* ============================================================
   NEW FILE — "Last X Digits Comparison" Boolean analysis block.
   Drags into any IF condition. All 8 comparison types; ALL X
   digits must satisfy the condition to return true.
   Styled to match the existing Tick Analysis blocks.
   ============================================================ */
import { localize } from '@deriv-com/translations';
import { modifyContextMenu } from '../../../utils';

window.Blockly.Blocks.last_x_digits_comparison = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Last {{ x }} digits are {{ comparison }} value {{ y }}', {
                x: '%1',
                comparison: '%2',
                y: '%3',
            }),
            args0: [
                {
                    type: 'input_value',
                    name: 'COUNT',
                    check: 'Number',
                },
                {
                    type: 'field_dropdown',
                    name: 'COMPARISON',
                    options: [
                        [localize('All Same'), 'all_same'],
                        [localize('All Different'), 'all_diff'],
                        [localize('Greater Than'), 'gt'],
                        [localize('Greater Than or Equal'), 'gte'],
                        [localize('Less Than'), 'lt'],
                        [localize('Less Than or Equal'), 'lte'],
                        [localize('Equal To'), 'eq'],
                        [localize('Not Equal To'), 'neq'],
                    ],
                },
                {
                    type: 'input_value',
                    name: 'DIGIT',
                    check: 'Number',
                },
            ],
            inputsInline: true,
            output: 'Boolean',
            outputShape: window.Blockly.OUTPUT_SHAPE_HEXAGONAL,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            tooltip: localize(
                'True only if ALL of the last X tick digits satisfy the condition. "All Same"/"All Different" ignore the value. Examples: Last 3 → All Same is true for 777; Last 5 → Greater Than 6 is true for 78987; Last 4 → Less Than or Equal 2 is true for 0122.'
            ),
            category: window.Blockly.Categories.Tick_Analysis,
        };
    },
    meta() {
        return {
            display_name: localize('Last X Digits Comparison'),
            description: localize(
                'This block checks the last X tick digits against a chosen comparison (All Same, All Different, Greater Than, Greater Than or Equal, Less Than, Less Than or Equal, Equal To, Not Equal To) and returns true only when every digit satisfies it. Combine it with IF blocks to trigger actions such as waiting for a repeated digit or purchasing a contract.'
            ),
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.last_x_digits_comparison = block => {
    const count =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '3';
    const comparison = block.getFieldValue('COMPARISON');
    const digit =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'DIGIT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '0';

    return [
        `Bot.tkLastXDigitsComparison(${count}, '${comparison}', ${digit})`,
        window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL,
    ];
};
