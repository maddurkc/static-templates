# Distribution List & Recipient Field Requirements

## Recipient Selection - Two Possibilities

There are 2 possibilities for how a user adds recipients to the To / CC / BCC fields:

1. **Manual selection** — User clicks on the To/CC/BCC field, searches for a user, and manually selects them.
2. **DL drawer selection** — User picks a Distribution List (DL) from the DL drawer, and the To/CC/BCC fields are populated automatically with the DL's members.

## DL Chip Removal - Use Cases

When a DL chip is removed, only the emails contributed by that DL should be cleared from To/CC/BCC. Manually selected users must remain untouched.

- **Use case 1:** Manual user selection first, then DL added. If I remove the DL from the chip, remove only the respective DL emails from To/CC/BCC — not the manually selected users.
- **Use case 2:** DL added from the drawer plus 2 manually selected users. If I remove the DL chip, remove only the respective DL emails from To/CC/BCC — not the manually selected users.
- **Use case 3:** Any combination of the above must behave the same way — manual picks are always preserved, only DL-sourced emails are removed when the DL chip is removed.

## Display Format

When a user is selected manually or comes in via a DL, the recipient pill currently shows the full email address. Instead, display the user's **name** (first name and last name). The raw email can remain available on hover/title, but the visible label must be the friendly name.
