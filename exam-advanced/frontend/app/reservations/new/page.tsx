export default function ReservationNewPage() {
  return (
    <div>
      <a href="/reservations/new" data-testid="nav-new">予約登録</a>
      <span> | </span>
      <a href="/reservations" data-testid="nav-list">予約一覧</a>
      <hr />

      <h1>予約登録</h1>

      <form>
        <fieldset>
          <legend>予約情報</legend>

          <p>
            リソース：
            <br />
            <label>
              <input type="radio" name="resource_id" value="room-a" data-testid="resource-id-room-a" />
              会議室A
            </label>
            <label>
              <input type="radio" name="resource_id" value="room-b" data-testid="resource-id-room-b" />
              会議室B
            </label>
            <label>
              <input type="radio" name="resource_id" value="room-c" data-testid="resource-id-room-c" />
              会議室C
            </label>
          </p>

          <p>
            <label htmlFor="event-name">イベント名：</label>
            <br />
            <input
              id="event-name"
              type="text"
              size={40}
              data-testid="event-name-input"
              placeholder="例: チームMTG"
            />
          </p>

          <p>
            <label htmlFor="start">開始日時：</label>
            <input
              id="start"
              type="datetime-local"
              data-testid="start-input"
            />
            <span>　</span>
            <label htmlFor="end">終了日時：</label>
            <input
              id="end"
              type="datetime-local"
              data-testid="end-input"
            />
          </p>

          <p>
            <button type="submit" data-testid="submit-button">
              登録
            </button>
          </p>
        </fieldset>
      </form>

      {/* TODO: 登録成功時に表示 */}
      {/* <p data-testid="success-message"><b>✓ 予約を登録しました</b></p> */}

      {/* TODO: エラー時に表示 */}
      {/* <p data-testid="error-message"><b>✗ この時間帯はすでに予約があります</b></p> */}
    </div>
  );
}
